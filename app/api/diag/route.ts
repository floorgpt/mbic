import { NextResponse } from "next/server";

import {
  getCategoryTotals,
  getDealerEngagement,
  getOrgKpis,
  getOrgMonthly,
  getTopDealers,
  getTopReps,
} from "@/lib/mbic-supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "2025-01-01";
  const to = url.searchParams.get("to") ?? "2025-10-01";

  try {
    const [kpis, monthly, dealers, reps, categories, engagement] = await Promise.all([
      getOrgKpis(from, to),
      getOrgMonthly(from, to),
      getTopDealers(from, to, 10, 0),
      getTopReps(from, to, 10, 0),
      getCategoryTotals(from, to),
      getDealerEngagement(from, to),
    ]);

    return NextResponse.json({
      ok: true,
      from,
      to,
      kpis,
      monthly,
      dealers,
      reps,
      categories,
      engagement,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        from,
        to,
        error: (error as Error)?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
