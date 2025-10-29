import { NextResponse } from "next/server";

import { getCollectionByDealer } from "@/lib/mbic-supabase-salesops";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!name || !from || !to) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing required parameters: name, from, to",
      },
      { status: 400 },
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase environment variables are not configured",
      },
      { status: 503 },
    );
  }

  try {
    const result = await getCollectionByDealer(name, from, to);
    return NextResponse.json({
      ok: result._meta.ok,
      meta: result._meta,
      data: result.data,
      from,
      to,
      collection: name,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: (error as Error)?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
