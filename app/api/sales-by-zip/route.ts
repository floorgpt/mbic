import { NextResponse } from "next/server";
import { getFloridaZipSalesSafe } from "@/lib/mbic-supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "FL";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const category = url.searchParams.get("category");
  const collection = url.searchParams.get("collection");

  // Validate required parameters
  if (!from || !to) {
    return NextResponse.json(
      { ok: false, error: "Missing required parameters: from and to dates" },
      { status: 400 },
    );
  }

  // Only Florida is currently supported
  if (state !== "FL") {
    return NextResponse.json(
      { ok: false, error: "Only Florida (FL) is currently supported" },
      { status: 400 },
    );
  }

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, error: "Supabase environment variables are not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await getFloridaZipSalesSafe(from, to, category, collection);

    // Transform to Nivo format: { id: zipCode, value: revenue }
    const nivoData = result.data.map((row) => ({
      id: row.zip_code,
      value: row.revenue,
      dealerCount: row.dealer_count,
      orderCount: row.order_count,
    }));

    return NextResponse.json({
      ok: result._meta.ok,
      data: nivoData,
      meta: result._meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api] sales-by-zip error:", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
