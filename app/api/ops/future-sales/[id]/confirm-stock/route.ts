import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseProductFromSku } from "@/lib/utils";
import { getFormsWebhookSettings, resolveWebhookUrl } from "@/lib/forms/settings";
import { triggerFutureSaleStockConfirmedWebhook } from "@/lib/ops/webhooks";
import type { ConfirmStockResponse } from "@/types/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const oppId = Number.parseInt(id, 10);

    if (Number.isNaN(oppId)) {
      return NextResponse.json(
        {
          ok: false,
          data: null,
          err: "Invalid opportunity ID",
        } satisfies ConfirmStockResponse,
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();

    // Update the opportunity to mark as stock confirmed
    const updateData = {
      ops_stock_confirmed: true,
      ops_confirmed_at: new Date().toISOString(),
      status: "closed",
      updated_at: new Date().toISOString(),
    };

    const { data: updateResult, error: updateError } = await supabase
      .from("future_sale_opportunities")
      .update(updateData as never)
      .eq("id", oppId)
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.error("[ops] confirm-stock:update-error", { id: oppId, error: updateError });
      return NextResponse.json(
        {
          ok: false,
          data: null,
          err: updateError.message,
        } satisfies ConfirmStockResponse,
        { status: 500 },
      );
    }

    if (!updateResult) {
      return NextResponse.json(
        {
          ok: false,
          data: null,
          err: "Opportunity not found",
        } satisfies ConfirmStockResponse,
        { status: 404 },
      );
    }

    // Fetch dealer and rep names separately
    const [dealersResult, repsResult] = await Promise.all([
      supabase.from("customers_demo").select("customer_id, dealer_name"),
      supabase.from("sales_reps_demo").select("rep_id, rep_name"),
    ]);

    const dealersMap = new Map(
      (dealersResult.data ?? []).map((d: { customer_id: number; dealer_name: string }) => [Number(d.customer_id), d.dealer_name]),
    );
    const repsMap = new Map((repsResult.data ?? []).map((r: { rep_id: number; rep_name: string }) => [Number(r.rep_id), r.rep_name]));

    const data = updateResult as unknown as Record<string, unknown>;
    const qty = Number(data.expected_qty ?? 0);
    const price = Number(data.expected_unit_price ?? 0);

    const dealerId = Number(data.dealer_id ?? 0);
    const repId = Number(data.rep_id ?? 0);
    const expectedSku = (data.expected_sku as string) ?? null;
    const { collection, color } = parseProductFromSku(expectedSku);

    const opportunity = {
      id: Number(data.id),
      project_name: String(data.project_name ?? ""),
      dealer_id: dealerId,
      dealer_name: dealersMap.get(dealerId) ?? "Unknown",
      rep_id: repId,
      rep_name: repsMap.get(repId) ?? "Unknown",
      expected_qty: qty,
      expected_unit_price: price,
      potential_amount: qty * price,
      probability_pct: Number(data.probability_pct ?? 0),
      expected_close_date: (data.expected_close_date as string) ?? null,
      needed_by_date: (data.needed_by_date as string) ?? null,
      expected_sku: expectedSku,
      collection,
      color,
      status: (data.status ?? "closed") as "open" | "in_process" | "closed",
      ops_stock_confirmed: Boolean(data.ops_stock_confirmed ?? true),
      ops_confirmed_at: (data.ops_confirmed_at as string) ?? null,
      notes: (data.notes as string) ?? null,
      created_at: String(data.created_at ?? ""),
      updated_at: String(data.updated_at ?? ""),
    };

    // Trigger webhook (non-blocking)
    const settings = await getFormsWebhookSettings();
    const { mode, url } = await resolveWebhookUrl(settings);

    const webhookResult = await triggerFutureSaleStockConfirmedWebhook(url, mode, opportunity);

    if (!webhookResult.ok) {
      console.warn("[ops] confirm-stock:webhook-failed", {
        ...webhookResult,
        note: "Stock was confirmed successfully, but webhook notification failed",
      });
      // Don't block the user - stock was confirmed successfully
    }

    console.log("[ops] confirm-stock:success", {
      id: oppId,
      project: data.project_name,
      webhookMode: mode,
      webhookOk: webhookResult.ok,
    });

    return NextResponse.json(
      {
        ok: true,
        data: opportunity,
        webhook: {
          ok: webhookResult.ok,
          err: webhookResult.err,
        },
      } satisfies ConfirmStockResponse,
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ops] confirm-stock:unhandled", message);
    return NextResponse.json(
      {
        ok: false,
        data: null,
        err: message,
      } satisfies ConfirmStockResponse,
      { status: 500 },
    );
  }
}
