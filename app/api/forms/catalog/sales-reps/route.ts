import { NextResponse } from "next/server";

import { getSalesReps } from "@/lib/forms/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const safe = await getSalesReps();
  const status = safe._meta.ok ? 200 : 502;

  console.log("[forms] api/catalog/sales-reps", safe._meta);

  return NextResponse.json(
    {
      ok: safe._meta.ok,
      data: safe.data,
      meta: safe._meta,
      err: safe._meta.err ?? null,
    },
    { status },
  );
}
