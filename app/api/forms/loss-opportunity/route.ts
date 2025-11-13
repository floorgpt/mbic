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

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRICT = process.env.FORMS_STRICT_CATALOGS === "true";

async function uploadAttachmentToSupabase(file: File): Promise<{ url: string } | { error: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { error: "Supabase credentials not configured" };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filename = `loss-opp-${timestamp}.${fileExtension}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("loss-opportunity-attachments")
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("[forms] upload:error", error);
      return { error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("loss-opportunity-attachments")
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl };
  } catch (error) {
    console.error("[forms] upload:exception", error);
    return { error: error instanceof Error ? error.message : "Upload failed" };
  }
}

export async function POST(request: Request) {
  let payload: LossOpportunityPayload | null = null;
  let attachmentFile: File | null = null;

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData (with file)
      const formData = await request.formData();
      const payloadStr = formData.get("payload");
      attachmentFile = formData.get("attachment") as File | null;

      if (typeof payloadStr !== "string") {
        throw new Error("Invalid payload in FormData");
      }

      payload = JSON.parse(payloadStr) as LossOpportunityPayload;
    } else {
      // Handle JSON (without file)
      payload = (await request.json()) as LossOpportunityPayload;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";
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
    normalized.categoryKey = normalized.categoryKey?.trim() ?? null;
    const trimmedCollection = normalized.collectionKey?.trim() ?? null;
    if (!trimmedCollection) {
      return NextResponse.json(
        {
          ok: false,
          err: "collection es requerida",
        },
        { status: 400 },
      );
    }
    normalized.collectionKey = trimmedCollection;
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
        console.warn("[forms] api/loss-opportunity:dealers-offline", dealersSafe._meta);
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
    }

    // Handle file upload if present
    let attachmentUrl: string | null = null;
    if (attachmentFile) {
      const uploadResult = await uploadAttachmentToSupabase(attachmentFile);
      if ("error" in uploadResult) {
        console.error("[forms] api/loss-opportunity:upload-failed", uploadResult.error);
        return NextResponse.json(
          {
            ok: false,
            err: `No pudimos subir el archivo: ${uploadResult.error}`,
          },
          { status: 500 },
        );
      }
      attachmentUrl = uploadResult.url;
    }

    // Add attachment URL to normalized payload
    const payloadWithAttachment = {
      ...normalized,
      attachmentUrl,
    };

    const insertResult = await insertLossOpportunity(payloadWithAttachment);

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
      console.warn("[forms] api/loss-opportunity:webhook-failed", {
        ...webhookResult,
        note: "Data was saved successfully, but webhook notification failed",
      });
      // Don't block the user - data was saved successfully
      // Just log the webhook failure
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
