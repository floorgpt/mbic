import { NextResponse } from "next/server";

import { runFormsDiagnostics } from "@/lib/forms/diag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dryRunParam = url.searchParams.get("dryRun");
  const dryRun = dryRunParam === "false" ? false : true;

  try {
    const result = await runFormsDiagnostics({ dryRun });
    console.log("[forms] api/diag-forms", { dryRun, ok: result.ok });

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
