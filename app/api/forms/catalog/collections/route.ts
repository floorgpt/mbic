import { NextResponse } from "next/server";

import { getCollectionsByCategory } from "@/lib/forms/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? "";

  if (!category) {
    return NextResponse.json(
      {
        ok: false,
        data: [],
        meta: { ok: false, count: 0, err: "category is required" },
        err: "category is required",
      },
      { status: 400 },
    );
  }

  const safe = await getCollectionsByCategory(category);
  const status = safe._meta.ok ? 200 : 502;

  console.log("[forms] api/catalog/collections", { category, ...safe._meta });

  return NextResponse.json(
    {
      ok: safe._meta.ok,
      data: safe.data,
      meta: safe._meta,
      err: safe._meta.err ?? null,
      category,
    },
    { status },
  );
}
