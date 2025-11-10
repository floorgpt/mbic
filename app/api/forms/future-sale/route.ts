import { NextResponse } from "next/server";

import {
  insertFutureSale,
  triggerFutureSaleWebhook,
  validateFutureSalePayload,
} from "@/lib/forms/future-sale";
import { getFormsWebhookSettings, resolveWebhookUrl } from "@/lib/forms/settings";
import {
  getCategories,
  getCollectionsByCategory,
  getColorsByCollection,
  getDealersByRep,
  getSalesReps,
} from "@/lib/forms/catalog";
import type { FutureSalePayload } from "@/types/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRICT = process.env.FORMS_STRICT_CATALOGS === "true";

export async function POST(request: Request) {
  let payload: FutureSalePayload | null = null;

  try {
    payload = (await request.json()) as FutureSalePayload;
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

  const validation = await validateFutureSalePayload(payload);
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
    normalized.categoryKey = normalized.categoryKey?.trim() ?? null;
    normalized.collectionKey = normalized.collectionKey?.trim() ?? null;
    normalized.colorName = normalized.colorName?.trim() || null;

    if (STRICT) {
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
      if (dealersSafe._meta.ok) {
        const dealerMatch = dealersSafe.data.find((dealer) => dealer.id === normalized.dealerId);
        if (!dealerMatch) {
          missingCatalogs.push(`dealer:${normalized.dealerId}`);
        }
      } else {
        console.warn("[forms] api/future-sale:dealers-offline", dealersSafe._meta);
      }

      // Category/Collection/Color validation is optional for future sales
      if (normalized.categoryKey) {
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

        if (normalized.collectionKey) {
          const collectionsSafe = await getCollectionsByCategory(categoryKey);
          if (!collectionsSafe._meta.ok) {
            catalogIssues.push(
              `collections:${categoryKey || "undefined"}: ${collectionsSafe._meta.err ?? "offline"}`,
            );
          } else if ((collectionsSafe.data?.length ?? 0) === 0) {
            missingCatalogs.push(`collections-empty:${categoryKey}`);
          }

          const collectionKey = normalized.collectionKey ?? "";
          if (collectionsSafe._meta.ok) {
            const collectionMatch = collectionsSafe.data.find(
              (collection) => collection.key.toLowerCase() === collectionKey.toLowerCase(),
            );
            if (!collectionMatch) {
              missingCatalogs.push(`collection:${collectionKey || "undefined"}`);
            }
          }

          if (normalized.colorName) {
            const colorsSafe = await getColorsByCollection(collectionKey);
            if (!colorsSafe._meta.ok) {
              catalogIssues.push(
                `colors:${collectionKey || "undefined"}: ${colorsSafe._meta.err ?? "offline"}`,
              );
            } else if ((colorsSafe.data?.length ?? 0) === 0) {
              missingCatalogs.push(`colors-empty:${collectionKey}`);
            }

            const colorName = normalized.colorName ?? "";
            if (colorsSafe._meta.ok && colorName) {
              const colorMatch = colorsSafe.data.find((color) => {
                const value = color.value?.toLowerCase?.() ?? "";
                const label = color.label?.toLowerCase?.() ?? "";
                const target = colorName.toLowerCase();
                return value === target || label === target;
              });
              if (!colorMatch) {
                missingCatalogs.push(`color:${colorName}`);
              }
            }
          }
        }
      }

      if (catalogIssues.length > 0) {
        console.error("[forms] api/future-sale:catalog-offline", { catalogIssues });
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
        console.warn("[forms] api/future-sale:missing-catalog", { missingCatalogs });
        return NextResponse.json(
          {
            ok: false,
            err: "Catálogos incompletos",
            missing: missingCatalogs,
          },
          { status: 400 },
        );
      }
    }

    const insertResult = await insertFutureSale(normalized);

    if (!insertResult._meta.ok) {
      console.error("[forms] api/future-sale:insert-failed", insertResult._meta);
      return NextResponse.json(
        {
          ok: false,
          err: insertResult._meta.err ?? "No pudimos registrar la oportunidad futura",
        },
        { status: 500 },
      );
    }

    const settings = await getFormsWebhookSettings();
    const { mode, url } = await resolveWebhookUrl(settings);

    const webhookResult = await triggerFutureSaleWebhook(
      url,
      mode,
      normalized,
      insertResult.data.id,
    );

    if (!webhookResult.ok) {
      console.warn("[forms] api/future-sale:webhook-failed", {
        ...webhookResult,
        note: "Data was saved successfully, but webhook notification failed",
      });
      // Don't block the user - data was saved successfully
      // Just log the webhook failure
    }

    console.log("[forms] api/future-sale:success", {
      projectName: normalized.projectName,
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
    console.error("[forms] api/future-sale:unhandled", message);
    return NextResponse.json(
      {
        ok: false,
        err: message,
      },
      { status: 500 },
    );
  }
}
