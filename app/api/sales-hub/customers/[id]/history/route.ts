import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET transfer history for a customer
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: "Invalid customer_id" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("customer_rep_transfers")
      .select(`
        *,
        from_rep:sales_reps_demo!customer_rep_transfers_from_rep_id_fkey(rep_id, rep_name),
        to_rep:sales_reps_demo!customer_rep_transfers_to_rep_id_fkey(rep_id, rep_name)
      `)
      .eq("customer_id", customerId)
      .order("transferred_at", { ascending: false });

    if (error) {
      console.error("[sales-hub/customers/history] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("[sales-hub/customers/history] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
