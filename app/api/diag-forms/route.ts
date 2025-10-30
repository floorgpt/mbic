import { NextResponse } from "next/server";

import { runFormsDiagnostics } from "@/lib/forms/diag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dryRunParam = url.searchParams.get("dryRun");
  const dryRun = dryRunParam === "false" ? false : true;
  const repIdParam = url.searchParams.get("repId");
  const categoryParam = url.searchParams.get("category");
  const collectionParam = url.searchParams.get("collection");
  const repIdValue = repIdParam ? Number.parseInt(repIdParam, 10) : null;
  const repId = Number.isFinite(repIdValue ?? NaN) ? repIdValue : null;

  const categoryKey = categoryParam ? categoryParam.trim() || null : null;
  const collectionKey = collectionParam ? collectionParam.trim() || null : null;

  try {
    const result = await runFormsDiagnostics({
      dryRun,
      repId,
      categoryKey,
      collectionKey,
    });
    console.log("[forms] api/diag-forms", {
      dryRun,
      repId,
      categoryKey,
      collectionKey,
      ok: result.ok,
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : 502,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[forms] api/diag-forms:error", message);
    return NextResponse.json(
      {
        ok: false,
        dryRun,
        checks: [],
        err: message,
      },
      { status: 500 },
    );
  }
}
