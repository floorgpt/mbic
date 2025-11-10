import { NextResponse } from "next/server";

function resolveBase(req: Request): string {
  const maybeNext = req as unknown as { nextUrl?: { origin?: string } };
  if (maybeNext?.nextUrl?.origin) {
    return maybeNext.nextUrl.origin;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.SITE_URL) {
    return process.env.SITE_URL;
  }
  return "https://cpf-mbic2.netlify.app";
}

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
  const skipColors = url.searchParams.get("skipColors") === "true";
  const repIdValue = repIdParam ? Number.parseInt(repIdParam, 10) : null;
  const repId = Number.isFinite(repIdValue ?? NaN) ? repIdValue : null;

  const categoryKey = categoryParam ? categoryParam.trim() || null : null;
  const collectionKey = collectionParam ? collectionParam.trim() || null : null;

  const baseUrl = resolveBase(request);

  try {
    const result = await runFormsDiagnostics({
      dryRun,
      repId,
      categoryKey,
      collectionKey,
      skipColors,
      baseUrl,
    });
    console.log("[forms] api/diag-forms", {
      dryRun,
      repId,
      categoryKey,
      collectionKey,
      skipColors,
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
