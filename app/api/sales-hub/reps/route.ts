import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET all sales reps
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("sales_reps_demo")
      .select("*")
      .order("rep_name", { ascending: true });

    if (error) {
      console.error("[sales-hub/reps] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("[sales-hub/reps] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new sales rep
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rep_name } = body;

    if (!rep_name || typeof rep_name !== "string" || rep_name.trim() === "") {
      return NextResponse.json(
        { error: "rep_name is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Insert new rep
    const { data, error } = await supabase
      .from("sales_reps_demo")
      .insert({ rep_name: rep_name.trim() })
      .select()
      .single();

    if (error) {
      console.error("[sales-hub/reps] POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create default targets for the new rep for current year
    const currentYear = new Date().getFullYear();
    const targets = [];
    for (let month = 1; month <= 12; month++) {
      targets.push({
        rep_id: data.rep_id,
        target_month: `${currentYear}-${String(month).padStart(2, "0")}`,
        target_amount: 200000.0,
        fiscal_year: currentYear,
      });
    }

    await supabase.from("sales_targets").insert(targets);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[sales-hub/reps] POST unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update sales rep
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { rep_id, rep_name } = body;

    if (!rep_id || !rep_name || typeof rep_name !== "string" || rep_name.trim() === "") {
      return NextResponse.json(
        { error: "rep_id and rep_name are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("sales_reps_demo")
      .update({ rep_name: rep_name.trim() })
      .eq("rep_id", rep_id)
      .select()
      .single();

    if (error) {
      console.error("[sales-hub/reps] PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[sales-hub/reps] PATCH unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
