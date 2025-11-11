import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseProductFromSku } from "@/lib/utils";
import type { FutureSaleUpdatePayload, FutureSaleUpdateResponse } from "@/types/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const oppId = Number.parseInt(id, 10);

    if (Number.isNaN(oppId)) {
      return NextResponse.json(
        {
          ok: false,
          data: null,
          err: "Invalid opportunity ID",
        } satisfies FutureSaleUpdateResponse,
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();

    // Fetch opportunity and related data separately
    const [oppResult, dealersResult, repsResult] = await Promise.all([
      supabase.from("future_sale_opportunities").select("*").eq("id", oppId).maybeSingle(),
      supabase.from("customers_demo").select("customer_id, dealer_name"),
      supabase.from("sales_reps_demo").select("rep_id, rep_name"),
    ]);

    if (oppResult.error) {
      console.error("[ops] future-sales:get-error", { id: oppId, error: oppResult.error });
      return NextResponse.json(
        {
          ok: false,
          data: null,
          err: oppResult.error.message,
        } satisfies FutureSaleUpdateResponse,
        { status: 500 },
      );
    }

    if (!oppResult.data) {
      return NextResponse.json(
        {
          ok: false,
          data: null,
          err: "Opportunity not found",
        } satisfies FutureSaleUpdateResponse,
        { status: 404 },
      );
    }

    const data = oppResult.data as unknown as Record<string, unknown>;
    const dealersMap = new Map(
      (dealersResult.data ?? []).map((d: { customer_id: number; dealer_name: string }) => [Number(d.customer_id), d.dealer_name]),
    );
    const repsMap = new Map((repsResult.data ?? []).map((r: { rep_id: number; rep_name: string }) => [Number(r.rep_id), r.rep_name]));

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
      status: (data.status ?? "open") as "open" | "in_process" | "closed",
      ops_stock_confirmed: Boolean(data.ops_stock_confirmed ?? false),
      ops_confirmed_at: (data.ops_confirmed_at as string) ?? null,
      notes: (data.notes as string) ?? null,
      created_at: String(data.created_at ?? ""),
      updated_at: String(data.updated_at ?? ""),
    };

    return NextResponse.json(
      {
        ok: true,
        data: opportunity,
      } satisfies FutureSaleUpdateResponse,
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ops] future-sales:get-unhandled", message);
    return NextResponse.json(
      {
        ok: false,
        data: null,
        err: message,
      } satisfies FutureSaleUpdateResponse,
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const oppId = Number.parseInt(id, 10);

    if (Number.isNaN(oppId)) {
      return NextResponse.json(
        {
          ok: false,
          data: null,
          err: "Invalid opportunity ID",
        } satisfies FutureSaleUpdateResponse,
        { status: 400 },
      );
    }

    const payload = (await request.json()) as FutureSaleUpdatePayload;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.status !== undefined) {
      if (!["open", "in_process", "closed"].includes(payload.status)) {
        return NextResponse.json(
          {
            ok: false,
            data: null,
            err: "Invalid status value",
          } satisfies FutureSaleUpdateResponse,
          { status: 400 },
        );
      }
      updateData.status = payload.status;
    }

    if (payload.notes !== undefined) {
      updateData.notes = payload.notes;
    }

    if (payload.expected_qty !== undefined) {
      updateData.expected_qty = payload.expected_qty;
    }

    if (payload.expected_unit_price !== undefined) {
      updateData.expected_unit_price = payload.expected_unit_price;
    }

    if (payload.probability_pct !== undefined) {
      updateData.probability_pct = payload.probability_pct;
    }

    if (payload.expected_close_date !== undefined) {
      updateData.expected_close_date = payload.expected_close_date;
    }

    if (payload.needed_by_date !== undefined) {
      updateData.needed_by_date = payload.needed_by_date;
    }

    if (payload.ops_stock_confirmed !== undefined) {
      updateData.ops_stock_confirmed = payload.ops_stock_confirmed;
    }

    if (payload.ops_confirmed_at !== undefined) {
      updateData.ops_confirmed_at = payload.ops_confirmed_at;
    }

    const supabase = getSupabaseAdminClient();

    // Update the opportunity
    const { data: updateResult, error: updateError } = await supabase
      .from("future_sale_opportunities")
      .update(updateData as never)
      .eq("id", oppId)
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.error("[ops] future-sales:update-error", { id: oppId, error: updateError });
      return NextResponse.json(
        {
          ok: false,
          data: null,
          err: updateError.message,
        } satisfies FutureSaleUpdateResponse,
        { status: 500 },
      );
    }

    if (!updateResult) {
      return NextResponse.json(
        {
          ok: false,
          data: null,
          err: "Opportunity not found or update failed",
        } satisfies FutureSaleUpdateResponse,
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
      status: (data.status ?? "open") as "open" | "in_process" | "closed",
      ops_stock_confirmed: Boolean(data.ops_stock_confirmed ?? false),
      ops_confirmed_at: (data.ops_confirmed_at as string) ?? null,
      notes: (data.notes as string) ?? null,
      created_at: String(data.created_at ?? ""),
      updated_at: String(data.updated_at ?? ""),
    };

    console.log("[ops] future-sales:updated", { id: oppId, status: payload.status });

    return NextResponse.json(
      {
        ok: true,
        data: opportunity,
      } satisfies FutureSaleUpdateResponse,
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ops] future-sales:update-unhandled", message);
    return NextResponse.json(
      {
        ok: false,
        data: null,
        err: message,
      } satisfies FutureSaleUpdateResponse,
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const oppId = Number.parseInt(id, 10);

    if (Number.isNaN(oppId)) {
      return NextResponse.json(
        {
          ok: false,
          data: null,
          err: "Invalid opportunity ID",
        } satisfies FutureSaleUpdateResponse,
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();

    // Delete the opportunity
    const { error: deleteError } = await supabase
      .from("future_sale_opportunities")
      .delete()
      .eq("id", oppId);

    if (deleteError) {
      console.error("[ops] future-sales:delete-error", { id: oppId, error: deleteError });
      return NextResponse.json(
        {
          ok: false,
          data: null,
          err: deleteError.message,
        } satisfies FutureSaleUpdateResponse,
        { status: 500 },
      );
    }

    console.log("[ops] future-sales:deleted", { id: oppId });

    return NextResponse.json(
      {
        ok: true,
        data: null,
      } satisfies FutureSaleUpdateResponse,
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ops] future-sales:delete-unhandled", message);
    return NextResponse.json(
      {
        ok: false,
        data: null,
        err: message,
      } satisfies FutureSaleUpdateResponse,
      { status: 500 },
    );
  }
}
