import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LogisticsExportResponse, LogisticsKPI } from "@/types/logistics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same dummy data as main route
const DUMMY_DATA: LogisticsKPI[] = [
  { id: 1, month: 1, year: 2025, sales: 608900, costs: 365340, gross_margin_pct: 30.5, inventory_turnover: 2.8, avg_delivery_days: 72, delivered_orders: 145, in_progress_orders: 23, not_delivered_orders: 8, order_accuracy_pct: 94.2, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" },
  { id: 2, month: 2, year: 2025, sales: 652100, costs: 391260, gross_margin_pct: 31.2, inventory_turnover: 3.1, avg_delivery_days: 68, delivered_orders: 158, in_progress_orders: 19, not_delivered_orders: 6, order_accuracy_pct: 95.1, created_at: "2025-02-01T00:00:00Z", updated_at: "2025-02-01T00:00:00Z" },
  { id: 3, month: 3, year: 2025, sales: 689450, costs: 413670, gross_margin_pct: 32.0, inventory_turnover: 3.3, avg_delivery_days: 66, delivered_orders: 172, in_progress_orders: 17, not_delivered_orders: 5, order_accuracy_pct: 95.8, created_at: "2025-03-01T00:00:00Z", updated_at: "2025-03-01T00:00:00Z" },
  { id: 4, month: 4, year: 2025, sales: 701200, costs: 420720, gross_margin_pct: 32.5, inventory_turnover: 3.4, avg_delivery_days: 64, delivered_orders: 180, in_progress_orders: 15, not_delivered_orders: 4, order_accuracy_pct: 96.3, created_at: "2025-04-01T00:00:00Z", updated_at: "2025-04-01T00:00:00Z" },
  { id: 5, month: 5, year: 2025, sales: 715800, costs: 429480, gross_margin_pct: 32.8, inventory_turnover: 3.5, avg_delivery_days: 63, delivered_orders: 188, in_progress_orders: 14, not_delivered_orders: 3, order_accuracy_pct: 96.7, created_at: "2025-05-01T00:00:00Z", updated_at: "2025-05-01T00:00:00Z" },
  { id: 6, month: 6, year: 2025, sales: 728600, costs: 437160, gross_margin_pct: 33.0, inventory_turnover: 3.6, avg_delivery_days: 65, delivered_orders: 195, in_progress_orders: 16, not_delivered_orders: 4, order_accuracy_pct: 96.1, created_at: "2025-06-01T00:00:00Z", updated_at: "2025-06-01T00:00:00Z" },
  { id: 7, month: 7, year: 2025, sales: 719300, costs: 431580, gross_margin_pct: 33.2, inventory_turnover: 3.5, avg_delivery_days: 66, delivered_orders: 189, in_progress_orders: 18, not_delivered_orders: 5, order_accuracy_pct: 95.6, created_at: "2025-07-01T00:00:00Z", updated_at: "2025-07-01T00:00:00Z" },
  { id: 8, month: 8, year: 2025, sales: 726900, costs: 436140, gross_margin_pct: 33.1, inventory_turnover: 3.5, avg_delivery_days: 65, delivered_orders: 192, in_progress_orders: 17, not_delivered_orders: 4, order_accuracy_pct: 95.9, created_at: "2025-08-01T00:00:00Z", updated_at: "2025-08-01T00:00:00Z" },
  { id: 9, month: 9, year: 2025, sales: 733284, costs: 439367, gross_margin_pct: 33.1, inventory_turnover: 3.5, avg_delivery_days: 65, delivered_orders: 198, in_progress_orders: 19, not_delivered_orders: 5, order_accuracy_pct: 96.2, created_at: "2025-09-01T00:00:00Z", updated_at: "2025-09-01T00:00:00Z" },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    const supabase = getSupabaseAdminClient();

    // Try to fetch from database first
    let data: LogisticsKPI[] = [];
    const { data: dbData, error: dbError } = await supabase
      .from("logistics_kpis")
      .select("*")
      .order("year", { ascending: true })
      .order("month", { ascending: true });

    if (dbError) {
      console.warn("[ops] logistics-export:db-error", dbError.message, "- using dummy data");
      data = DUMMY_DATA;
    } else if (dbData && dbData.length > 0) {
      data = dbData as unknown as LogisticsKPI[];
    } else {
      console.log("[ops] logistics-export:no-data - using dummy data");
      data = DUMMY_DATA;
    }

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "Month",
        "Year",
        "Sales",
        "Costs",
        "Gross Margin %",
        "Inventory Turnover",
        "Avg Delivery Days",
        "Delivered Orders",
        "In Progress Orders",
        "Not Delivered Orders",
        "Order Accuracy %",
      ];

      const rows = data.map((row) => [
        row.month,
        row.year,
        row.sales,
        row.costs,
        row.gross_margin_pct,
        row.inventory_turnover,
        row.avg_delivery_days,
        row.delivered_orders,
        row.in_progress_orders,
        row.not_delivered_orders,
        row.order_accuracy_pct,
      ]);

      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="logistics_kpis_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Default JSON response
    return NextResponse.json(
      {
        ok: true,
        data,
        count: data.length,
      } satisfies LogisticsExportResponse,
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ops] logistics-export:unhandled", message);
    return NextResponse.json(
      {
        ok: false,
        data: [],
        count: 0,
        err: message,
      } satisfies LogisticsExportResponse,
      { status: 500 },
    );
  }
}
