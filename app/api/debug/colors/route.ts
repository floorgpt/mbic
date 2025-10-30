import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collection = url.searchParams.get("collection");

  if (!collection) {
    return NextResponse.json(
      { ok: false, err: "Missing collection param" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc(
      "get_colors_by_collection_v2" as never,
      { p_collection: collection } as never,
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, err: String(error) },
      { status: 502 },
    );
  }
}
