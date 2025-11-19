import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET all targets (optionally filtered by year)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");

    const supabase = getSupabaseAdminClient();

    let query = supabase
      .from("sales_targets")
      .select("*")
      .order("target_month", { ascending: true })
      .order("rep_id", { ascending: true });

    if (year) {
      query = query.eq("fiscal_year", parseInt(year));
    }

    const { data, error } = await query;

    if (error) {
      console.error("[sales-hub/targets] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("[sales-hub/targets] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update single target
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { rep_id, target_month, target_amount } = body;

    if (!rep_id || !target_month || target_amount === undefined) {
      return NextResponse.json(
        { error: "rep_id, target_month, and target_amount are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("sales_targets")
      .upsert(
        {
          rep_id,
          target_month,
          target_amount: parseFloat(target_amount),
          fiscal_year: parseInt(target_month.split("-")[0]),
        } as never,
        { onConflict: "rep_id,target_month" }
      )
      .select()
      .single();

    if (error) {
      console.error("[sales-hub/targets] PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[sales-hub/targets] PATCH unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Bulk update targets from CSV
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targets } = body;

    if (!Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json(
        { error: "targets array is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Validate and prepare targets
    const preparedTargets = targets.map((t) => ({
      rep_id: t.rep_id,
      target_month: t.target_month,
      target_amount: parseFloat(t.target_amount),
      fiscal_year: parseInt(t.target_month.split("-")[0]),
    }));

    const { data, error } = await supabase
      .from("sales_targets")
      .upsert(preparedTargets as never, { onConflict: "rep_id,target_month" })
      .select();

    if (error) {
      console.error("[sales-hub/targets] POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      message: `Successfully updated ${data?.length || 0} targets`
    });
  } catch (error) {
    console.error("[sales-hub/targets] POST unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
