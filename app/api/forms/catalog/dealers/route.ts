import { NextResponse } from "next/server";

import { getDealersByRep } from "@/lib/forms/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRepId(repIdParam: string | null): number | null {
  if (!repIdParam) return null;
  const parsed = Number.parseInt(repIdParam, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const repId = parseRepId(url.searchParams.get("repId"));

  if (!repId) {
    return NextResponse.json(
      {
        ok: false,
        data: [],
        meta: { ok: false, count: 0, err: "repId is required" },
        err: "repId is required",
      },
      { status: 400 },
    );
  }

  const safe = await getDealersByRep(repId);
  const status = safe._meta.ok ? 200 : 502;

  console.log("[forms] api/catalog/dealers", { repId, ...safe._meta });

  return NextResponse.json(
    {
      ok: safe._meta.ok,
      data: safe.data,
      meta: safe._meta,
      err: safe._meta.err ?? null,
      repId,
    },
    { status },
  );
}
