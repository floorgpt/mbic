import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseProductFromSku } from "@/lib/utils";
import type { FutureSalesListResponse } from "@/types/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    // Fetch opportunities, dealers, and reps separately then join in memory
    const [oppsResult, dealersResult, repsResult] = await Promise.all([
      supabase
        .from("future_sale_opportunities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("customers_demo").select("customer_id, dealer_name"),
      supabase.from("sales_reps_demo").select("rep_id, rep_name"),
    ]);

    if (oppsResult.error) {
      console.error("[ops] future-sales:opps-error", oppsResult.error);
      return NextResponse.json(
        {
          ok: false,
          data: [],
          count: 0,
          err: `Failed to fetch opportunities: ${oppsResult.error.message}`,
        } satisfies FutureSalesListResponse,
        { status: 500 },
      );
    }

    // Create lookup maps for dealers and reps (using numeric keys)
    const dealersMap = new Map(
      (dealersResult.data ?? []).map((d: { customer_id: number; dealer_name: string }) => [Number(d.customer_id), d.dealer_name]),
    );
    const repsMap = new Map((repsResult.data ?? []).map((r: { rep_id: number; rep_name: string }) => [Number(r.rep_id), r.rep_name]));

    // Transform data with joined names
    const opportunities = (oppsResult.data ?? []).map((row: Record<string, unknown>) => {
      const qty = Number(row.expected_qty ?? 0);
      const price = Number(row.expected_unit_price ?? 0);
      const potentialAmount = qty * price;
      const dealerId = Number(row.dealer_id ?? 0);
      const repId = Number(row.rep_id ?? 0);
      const expectedSku = (row.expected_sku as string) ?? null;
      const { collection, color } = parseProductFromSku(expectedSku);

      return {
        id: Number(row.id),
        project_name: String(row.project_name ?? ""),
        dealer_id: dealerId,
        dealer_name: dealersMap.get(dealerId) ?? "Unknown",
        rep_id: repId,
        rep_name: repsMap.get(repId) ?? "Unknown",
        expected_qty: qty,
        expected_unit_price: price,
        potential_amount: potentialAmount,
        probability_pct: Number(row.probability_pct ?? 0),
        expected_close_date: (row.expected_close_date as string) ?? null,
        needed_by_date: (row.needed_by_date as string) ?? null,
        expected_sku: expectedSku,
        collection,
        color,
        status: (row.status ?? "open") as "open" | "in_process" | "closed",
        ops_stock_confirmed: Boolean(row.ops_stock_confirmed ?? false),
        ops_confirmed_at: (row.ops_confirmed_at as string) ?? null,
        notes: (row.notes as string) ?? null,
        created_at: String(row.created_at ?? ""),
        updated_at: String(row.updated_at ?? ""),
      };
    });

    return NextResponse.json(
      {
        ok: true,
        data: opportunities,
        count: opportunities.length,
      } satisfies FutureSalesListResponse,
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ops] future-sales:unhandled", message);
    return NextResponse.json(
      {
        ok: false,
        data: [],
        count: 0,
        err: message,
      } satisfies FutureSalesListResponse,
      { status: 500 },
    );
  }
}
