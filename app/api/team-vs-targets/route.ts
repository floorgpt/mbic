import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get("targetMonth");

    if (!targetMonth) {
      return NextResponse.json(
        { error: "targetMonth parameter is required (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Extract YYYY-MM from the date
    const monthStr = targetMonth.substring(0, 7); // "2025-01-15" -> "2025-01"

    const supabase = getSupabaseAdminClient();

    // Call the RPC function
    const { data, error } = await supabase.rpc("team_vs_targets_month", {
      p_target_month: monthStr,
    });

    if (error) {
      console.error("[team-vs-targets] RPC error:", error);
      return NextResponse.json(
        { error: error.message, data: [] },
        { status: 200 } // Return 200 with empty data so UI doesn't break
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("[team-vs-targets] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", data: [] },
      { status: 200 } // Return 200 with empty data so UI doesn't break
    );
  }
}
