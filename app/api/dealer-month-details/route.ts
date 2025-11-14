import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get("targetMonth");

    if (!targetMonth) {
      return NextResponse.json({ error: "Missing targetMonth parameter" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch month details
    const { data: monthDetails, error: monthError } = await supabase
      .rpc("dealer_activity_month_details", { p_target_month: targetMonth })
      .single();

    if (monthError) {
      console.error("[dealer-month-details] Month details error:", monthError);
      return NextResponse.json({ error: monthError.message }, { status: 500 });
    }

    // Fetch reactivated dealers
    const { data: reactivatedDealers, error: reactivatedError } = await supabase
      .rpc("reactivated_dealers_by_month", { p_target_month: targetMonth });

    if (reactivatedError) {
      console.error("[dealer-month-details] Reactivated dealers error:", reactivatedError);
    }

    // Fetch active dealers (for download)
    const { data: activeDealers, error: activeError } = await supabase
      .rpc("active_dealers_by_month", { p_target_month: targetMonth });

    if (activeError) {
      console.error("[dealer-month-details] Active dealers error:", activeError);
    }

    // Fetch inactive dealers (for download)
    const { data: inactiveDealers, error: inactiveError } = await supabase
      .rpc("inactive_dealers_by_month", { p_target_month: targetMonth });

    if (inactiveError) {
      console.error("[dealer-month-details] Inactive dealers error:", inactiveError);
    }

    return NextResponse.json({
      monthDetails,
      reactivatedDealers: reactivatedDealers || [],
      activeDealers: activeDealers || [],
      inactiveDealers: inactiveDealers || [],
    });
  } catch (error) {
    console.error("[dealer-month-details] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
