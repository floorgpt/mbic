import { NextResponse } from "next/server";

import {
  insertLossOpportunity,
  triggerLossOpportunityWebhook,
  validateLossOpportunityPayload,
} from "@/lib/forms/loss-opportunity";
import { getFormsWebhookSettings, resolveWebhookUrl } from "@/lib/forms/settings";
import {
  getCategories,
  getCollectionsByCategory,
  getColorsByCollection,
  getDealersByRep,
  getSalesReps,
} from "@/lib/forms/catalog";
import type { LossOpportunityPayload } from "@/types/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: LossOpportunityPayload | null = null;

  try {
    payload = (await request.json()) as LossOpportunityPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON payload";
    return NextResponse.json(
      {
        ok: false,
        err: message,
      },
      { status: 400 },
    );
  }

  const validation = await validateLossOpportunityPayload(payload);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        err: "Payload inválido",
        errors: validation.errors,
      },
      { status: 400 },
    );
  }

  try {
    const normalized = validation.data;

    const catalogIssues: string[] = [];
    const missingCatalogs: string[] = [];

    const repsSafe = await getSalesReps();
    if (!repsSafe._meta.ok) {
      catalogIssues.push(`sales-reps: ${repsSafe._meta.err ?? "offline"}`);
    }
    const repMatch = repsSafe.data.find((rep) => rep.id === normalized.repId);
    if (!repMatch) {
      missingCatalogs.push(`rep:${normalized.repId}`);
    }

    const dealersSafe = await getDealersByRep(normalized.repId);
    if (!dealersSafe._meta.ok) {
      catalogIssues.push(`dealers: ${dealersSafe._meta.err ?? "offline"}`);
    }
    const dealerMatch = dealersSafe.data.find((dealer) => dealer.id === normalized.dealerId);
    if (!dealerMatch) {
      missingCatalogs.push(`dealer:${normalized.dealerId}`);
    }

    const categoriesSafe = await getCategories();
    if (!categoriesSafe._meta.ok) {
      catalogIssues.push(`categories: ${categoriesSafe._meta.err ?? "offline"}`);
    }
    const categoryKey = normalized.categoryKey ?? "";
    const categoryMatch = categoriesSafe.data.find(
      (category) => category.key.toLowerCase() === categoryKey.toLowerCase(),
    );
    if (!categoryMatch) {
      missingCatalogs.push(`category:${categoryKey || "undefined"}`);
    }

    const collectionsSafe = await getCollectionsByCategory(categoryKey);
    if (!collectionsSafe._meta.ok) {
      catalogIssues.push(
        `collections:${categoryKey || "undefined"}: ${collectionsSafe._meta.err ?? "offline"}`,
      );
    }
    const collectionKey = normalized.collectionKey ?? "";
    const collectionMatch = collectionsSafe.data.find(
      (collection) => collection.key.toLowerCase() === collectionKey.toLowerCase(),
    );
    if (!collectionMatch) {
      missingCatalogs.push(`collection:${collectionKey || "undefined"}`);
    }

    const colorsSafe = await getColorsByCollection(collectionKey);
    if (!colorsSafe._meta.ok) {
      catalogIssues.push(
        `colors:${collectionKey || "undefined"}: ${colorsSafe._meta.err ?? "offline"}`,
      );
    }
    const colorName = normalized.colorName ?? "";
    const colorMatch = colorsSafe.data.find(
      (color) => color.name.toLowerCase() === colorName.toLowerCase(),
    );
    if (!colorMatch) {
      missingCatalogs.push(`color:${colorName || "undefined"}`);
    }

    if (catalogIssues.length > 0) {
      console.error("[forms] api/loss-opportunity:catalog-offline", { catalogIssues });
      return NextResponse.json(
        {
          ok: false,
          err: "Catálogos fuera de línea",
          details: catalogIssues,
        },
        { status: 502 },
      );
    }

    if (missingCatalogs.length > 0) {
      console.warn("[forms] api/loss-opportunity:missing-catalog", { missingCatalogs });
      return NextResponse.json(
        {
          ok: false,
          err: "Catálogos incompletos",
          missing: missingCatalogs,
        },
        { status: 400 },
      );
    }

    const insertResult = await insertLossOpportunity(normalized);

    if (!insertResult._meta.ok) {
      console.error("[forms] api/loss-opportunity:insert-failed", insertResult._meta);
      return NextResponse.json(
        {
          ok: false,
          err: insertResult._meta.err ?? "No pudimos registrar la pérdida",
        },
        { status: 500 },
      );
    }

    const settings = await getFormsWebhookSettings();
    const { mode, url } = await resolveWebhookUrl(settings);

    const webhookResult = await triggerLossOpportunityWebhook(
      url,
      mode,
      normalized,
      insertResult.data.id,
    );

    if (!webhookResult.ok) {
      console.error("[forms] api/loss-opportunity:webhook-failed", webhookResult);
      return NextResponse.json(
        {
          ok: false,
          err: webhookResult.err ?? "El webhook no respondió",
          id: insertResult.data.id,
          webhook: {
            mode,
            url,
            status: webhookResult.status ?? null,
          },
        },
        { status: 502 },
      );
    }

    console.log("[forms] api/loss-opportunity:success", {
      repId: normalized.repId,
      dealerId: normalized.dealerId,
      id: insertResult.data.id,
      webhookMode: mode,
    });

    return NextResponse.json(
      {
        ok: true,
        id: insertResult.data.id,
        webhook: {
          mode,
          url,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[forms] api/loss-opportunity:unhandled", message);
    return NextResponse.json(
      {
        ok: false,
        err: message,
      },
      { status: 500 },
    );
  }
}
