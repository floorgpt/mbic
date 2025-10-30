import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collection = url.searchParams.get("collection") ?? "";

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("get_colors_by_collection_v2", {
    p_collection: collection,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        err: error.message ?? "RPC failed",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    data,
  });
}
