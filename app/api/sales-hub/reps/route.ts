import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SalesRepRow } from "@/types/database";

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
    const { rep_name, rep_email, rep_phone, rep_profile_picture } = body;

    if (!rep_name || typeof rep_name !== "string" || rep_name.trim() === "") {
      return NextResponse.json(
        { error: "rep_name is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Prepare insert data
    const insertData: {
      rep_name: string;
      rep_email?: string | null;
      rep_phone?: string | null;
      rep_profile_picture?: string | null;
    } = {
      rep_name: rep_name.trim(),
    };

    if (rep_email) insertData.rep_email = rep_email.trim();
    if (rep_phone) insertData.rep_phone = rep_phone.trim();
    if (rep_profile_picture) insertData.rep_profile_picture = rep_profile_picture;

    // Insert new rep
    const { data, error } = await supabase
      .from("sales_reps_demo")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("[sales-hub/reps] POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Failed to create sales rep" },
        { status: 500 }
      );
    }

    // Create default targets for the new rep for current year
    const currentYear = new Date().getFullYear();
    const newRep = data as SalesRepRow;
    const targets = [];
    for (let month = 1; month <= 12; month++) {
      targets.push({
        rep_id: newRep.rep_id,
        target_month: `${currentYear}-${String(month).padStart(2, "0")}`,
        target_amount: 200000.0,
        fiscal_year: currentYear,
      });
    }

    await supabase.from("sales_targets").insert(targets as never);

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
    const { rep_id, rep_name, rep_email, rep_phone, rep_profile_picture } = body;

    if (!rep_id || !rep_name || typeof rep_name !== "string" || rep_name.trim() === "") {
      return NextResponse.json(
        { error: "rep_id and rep_name are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Prepare update data
    const updateData: {
      rep_name: string;
      rep_email?: string | null;
      rep_phone?: string | null;
      rep_profile_picture?: string | null;
    } = {
      rep_name: rep_name.trim(),
    };

    // Handle optional fields - explicitly set to null if empty string
    updateData.rep_email = rep_email && rep_email.trim() ? rep_email.trim() : null;
    updateData.rep_phone = rep_phone && rep_phone.trim() ? rep_phone.trim() : null;
    updateData.rep_profile_picture = rep_profile_picture || null;

    const { data, error } = await supabase
      .from("sales_reps_demo")
      .update(updateData as never)
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
