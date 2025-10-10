import { NextResponse, type NextRequest } from "next/server";

import {
  fetchActiveCustomersByRep,
  fetchDealerBreakdownByRep,
  fetchTopCollections,
  fetchTopDealers,
  fetchTotalSalesPerDealer,
} from "@/lib/supabase/queries";

type SalesDataPayload = {
  query_type: string;
  limit?: number;
  rep_name?: string;
};

export async function POST(request: NextRequest) {
  let payload: SalesDataPayload;

  try {
    payload = (await request.json()) as SalesDataPayload;
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload", details: String(error) },
      { status: 400 },
    );
  }

  if (!payload?.query_type) {
    return NextResponse.json(
      { error: "query_type is required" },
      { status: 400 },
    );
  }

  try {
    switch (payload.query_type) {
      case "top_dealers": {
        const data = await fetchTopDealers(payload.limit ?? 5);
        return NextResponse.json({ data });
      }
      case "total_sales_per_dealer": {
        const data = await fetchTotalSalesPerDealer();
        return NextResponse.json({ data });
      }
      case "sales_by_rep": {
        if (!payload.rep_name) {
          return NextResponse.json(
            { error: "rep_name is required for sales_by_rep queries" },
            { status: 400 },
          );
        }
        const [dealerBreakdown, activeCustomers] = await Promise.all([
          fetchDealerBreakdownByRep(payload.rep_name),
          fetchActiveCustomersByRep(payload.rep_name),
        ]);

        return NextResponse.json({
          data: {
            rep: payload.rep_name,
            dealerBreakdown,
            activeCustomers,
          },
        });
      }
      case "popular_collections": {
        const data = await fetchTopCollections(payload.limit ?? 5);
        return NextResponse.json({ data });
      }
      default:
        return NextResponse.json(
          {
            error: "Unsupported query_type",
            supported: [
              "top_dealers",
              "total_sales_per_dealer",
              "sales_by_rep",
              "popular_collections",
            ],
          },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to execute query", details: String(error) },
      { status: 500 },
    );
  }
}
