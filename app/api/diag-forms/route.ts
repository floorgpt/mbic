import { NextResponse } from "next/server";

import { runFormsDiagnostics } from "@/lib/forms/diag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dryRunParam = url.searchParams.get("dryRun");
  const dryRun = dryRunParam === "false" ? false : true;

  const result = await runFormsDiagnostics({ dryRun });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 502,
  });
}
