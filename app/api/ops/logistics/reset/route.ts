import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dummy data matching the migration seed data
const DUMMY_DATA = [
  { month: 1, year: 2025, sales: 608900, costs: 365340, gross_margin_pct: 30.5, inventory_turnover: 2.8, avg_delivery_days: 72, delivered_orders: 145, in_progress_orders: 23, not_delivered_orders: 8, order_accuracy_pct: 94.2 },
  { month: 2, year: 2025, sales: 652100, costs: 391260, gross_margin_pct: 31.2, inventory_turnover: 3.1, avg_delivery_days: 68, delivered_orders: 158, in_progress_orders: 19, not_delivered_orders: 6, order_accuracy_pct: 95.1 },
  { month: 3, year: 2025, sales: 689450, costs: 413670, gross_margin_pct: 32.0, inventory_turnover: 3.3, avg_delivery_days: 66, delivered_orders: 172, in_progress_orders: 17, not_delivered_orders: 5, order_accuracy_pct: 95.8 },
  { month: 4, year: 2025, sales: 701200, costs: 420720, gross_margin_pct: 32.5, inventory_turnover: 3.4, avg_delivery_days: 64, delivered_orders: 180, in_progress_orders: 15, not_delivered_orders: 4, order_accuracy_pct: 96.3 },
  { month: 5, year: 2025, sales: 715800, costs: 429480, gross_margin_pct: 32.8, inventory_turnover: 3.5, avg_delivery_days: 63, delivered_orders: 188, in_progress_orders: 14, not_delivered_orders: 3, order_accuracy_pct: 96.7 },
  { month: 6, year: 2025, sales: 728600, costs: 437160, gross_margin_pct: 33.0, inventory_turnover: 3.6, avg_delivery_days: 65, delivered_orders: 195, in_progress_orders: 16, not_delivered_orders: 4, order_accuracy_pct: 96.1 },
  { month: 7, year: 2025, sales: 719300, costs: 431580, gross_margin_pct: 33.2, inventory_turnover: 3.5, avg_delivery_days: 66, delivered_orders: 189, in_progress_orders: 18, not_delivered_orders: 5, order_accuracy_pct: 95.6 },
  { month: 8, year: 2025, sales: 726900, costs: 436140, gross_margin_pct: 33.1, inventory_turnover: 3.5, avg_delivery_days: 65, delivered_orders: 192, in_progress_orders: 17, not_delivered_orders: 4, order_accuracy_pct: 95.9 },
  { month: 9, year: 2025, sales: 733284, costs: 439367, gross_margin_pct: 33.1, inventory_turnover: 3.5, avg_delivery_days: 65, delivered_orders: 198, in_progress_orders: 19, not_delivered_orders: 5, order_accuracy_pct: 96.2 },
];

export async function POST() {
  try {
    const supabase = getSupabaseAdminClient();

    // Delete all existing data
    const { error: deleteError } = await supabase
      .from("logistics_kpis")
      .delete()
      .neq("id", 0); // Delete all rows

    if (deleteError) {
      console.error("[ops] reset:delete-error", deleteError);
      // Continue anyway - table might be empty
    }

    // Insert dummy data
    const { error: insertError } = await supabase
      .from("logistics_kpis")
      .insert(DUMMY_DATA as never[])
      .select();

    if (insertError) {
      console.error("[ops] reset:insert-error", insertError);
      return NextResponse.json(
        {
          ok: false,
          err: `Database error: ${insertError.message}. The table may not exist yet. Please ensure the migration has been run.`,
        },
        { status: 500 },
      );
    }

    console.log("[ops] reset:success", {
      rowsInserted: DUMMY_DATA.length,
      dateRange: "Jan-Sep 2025",
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          rowsInserted: DUMMY_DATA.length,
          message: "Data reset to dummy values successfully",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ops] reset:unhandled", message);
    return NextResponse.json(
      { ok: false, err: message },
      { status: 500 },
    );
  }
}
