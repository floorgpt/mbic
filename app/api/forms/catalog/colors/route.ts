import { NextResponse } from "next/server";

import { getColorsByCollection } from "@/lib/forms/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collection = url.searchParams.get("collection") ?? "";

  if (!collection) {
    return NextResponse.json(
      {
        ok: false,
        data: [],
        meta: { ok: false, count: 0, err: "collection is required" },
        err: "collection is required",
      },
      { status: 400 },
    );
  }

  const safe = await getColorsByCollection(collection);
  const status = safe._meta.ok ? 200 : 502;

  console.log("[forms] api/catalog/colors", { collection, ...safe._meta });

  return NextResponse.json(
    {
      ok: safe._meta.ok,
      data: safe.data,
      meta: safe._meta,
      err: safe._meta.err ?? null,
      collection,
    },
    { status },
  );
}
