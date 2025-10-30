import { NextResponse } from "next/server";

import { getCategories } from "@/lib/forms/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const safe = await getCategories();
  const status = safe._meta.ok ? 200 : 502;

  console.log("[forms] api/catalog/categories", safe._meta);

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
