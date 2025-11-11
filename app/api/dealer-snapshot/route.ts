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

    console.log(`[dealer-snapshot] Fetching dealer ${dealerId}, collection ${collection}, from ${from} to ${to}`);

    // Get dealer info
    const { data: dealerData, error: dealerError } = await supabase
      .from("customers_demo")
      .select("customer_id, dealer_name")
      .eq("customer_id", dealerId)
      .single();

    if (dealerError || !dealerData) {
      console.error("[dealer-snapshot] dealer:error", dealerError);
      return NextResponse.json(
        {
          ok: false,
          error: `Dealer not found: ${dealerError?.message ?? "Unknown error"}`,
        },
        { status: 404 },
      );
    }

    console.log(`[dealer-snapshot] Found dealer: ${(dealerData as { dealer_name: string }).dealer_name}`);

    // Get sales rep from sales_demo (rep is associated with sales, not dealers directly)
    const { data: salesWithRep, error: repLookupError } = await supabase
      .from("sales_demo")
      .select("rep_id")
      .eq("customer_id", dealerId)
      .gte("invoice_date", from)
      .lt("invoice_date", to)
      .limit(1)
      .maybeSingle();

    if (repLookupError) {
      console.error("[dealer-snapshot] rep-lookup:error", repLookupError);
    }

    const repId = (salesWithRep as { rep_id: number } | null)?.rep_id ?? null;
    console.log(`[dealer-snapshot] Found rep_id: ${repId}`);

    // Get sales rep name if we found a rep
    type RepRow = { rep_id: number; rep_name: string };
    const { data: repData } = repId
      ? await supabase
          .from("sales_reps_demo")
          .select("rep_id, rep_name")
          .eq("rep_id", repId)
          .single()
      : { data: null };

    const typedRepData = repData as RepRow | null;
    console.log(`[dealer-snapshot] Rep data:`, typedRepData);

    // Get collection revenue for this dealer
    const { data: collectionSales, error: collectionError } = await supabase
      .from("sales_demo")
      .select("invoice_amount")
      .eq("customer_id", dealerId)
      .eq("collection", collection)
      .gte("invoice_date", from)
      .lt("invoice_date", to);

    if (collectionError) {
      console.error("[dealer-snapshot] collection-sales:error", collectionError);
    }

    type SaleRow = { invoice_amount: number };

    const collectionRevenue = (collectionSales as SaleRow[] | null)?.reduce(
      (sum, sale) => sum + Number(sale.invoice_amount),
      0,
    ) ?? 0;

    // Get total revenue for this dealer (all collections)
    const { data: totalSales, error: totalError } = await supabase
      .from("sales_demo")
      .select("invoice_amount")
      .eq("customer_id", dealerId)
      .gte("invoice_date", from)
      .lt("invoice_date", to);

    if (totalError) {
      console.error("[dealer-snapshot] total-sales:error", totalError);
    }

    const totalRevenue = (totalSales as SaleRow[] | null)?.reduce(
      (sum, sale) => sum + Number(sale.invoice_amount),
      0,
    ) ?? 0;

    const collectionSharePct = totalRevenue > 0 ? (collectionRevenue / totalRevenue) * 100 : 0;

    // Get invoice count for CSV download
    const invoiceCount = collectionSales?.length ?? 0;

    const typedDealerData = dealerData as { customer_id: number; dealer_name: string };

    return NextResponse.json({
      ok: true,
      data: {
        dealer_id: typedDealerData.customer_id,
        dealer_name: typedDealerData.dealer_name,
        rep_id: repId,
        rep_name: typedRepData?.rep_name ?? "Unknown",
        collection,
        collection_revenue: collectionRevenue,
        total_revenue: totalRevenue,
        collection_share_pct: collectionSharePct,
        invoice_count: invoiceCount,
        from,
        to,
      },
    });
  } catch (error) {
    console.error("[dealer-snapshot] unhandled:error", error);
    return NextResponse.json(
      {
        ok: false,
        error: (error as Error)?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
