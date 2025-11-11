import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dealerId = url.searchParams.get("dealerId");
  const collection = url.searchParams.get("collection");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!dealerId || !collection || !from || !to) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing required parameters: dealerId, collection, from, to",
      },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();

    // Get dealer name
    const { data: dealerData } = await supabase
      .from("customers_demo")
      .select("dealer_name")
      .eq("customer_id", dealerId)
      .single();

    const dealerName = dealerData?.dealer_name ?? `Dealer-${dealerId}`;

    // Get all invoices for this dealer and collection
    const { data: invoices, error } = await supabase
      .from("sales_demo")
      .select("invoice_date, invoice_number, sku, color, invoice_amount, collection")
      .eq("customer_id", dealerId)
      .eq("collection", collection)
      .gte("invoice_date", from)
      .lt("invoice_date", to)
      .order("invoice_date", { ascending: false });

    if (error) {
      console.error("[dealer-collection-invoices] query:error", error);
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    // Generate CSV
    const headers = ["Invoice Date", "Invoice Number", "SKU", "Color", "Amount", "Collection"];
    const rows = invoices?.map((inv) => [
      inv.invoice_date,
      inv.invoice_number ?? "",
      inv.sku ?? "",
      inv.color ?? "",
      inv.invoice_amount,
      inv.collection ?? "",
    ]) ?? [];

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const str = String(value ?? "");
            return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
          })
          .join(","),
      )
      .join("\n");

    const fileName = `${dealerName.replace(/[^a-z0-9]/gi, "-")}-${collection.replace(/[^a-z0-9]/gi, "-")}-invoices.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("[dealer-collection-invoices] unhandled:error", error);
    return NextResponse.json(
      {
        ok: false,
        error: (error as Error)?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
