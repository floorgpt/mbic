import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collection = (url.searchParams.get("collection") ?? "").trim();

  if (!collection) {
    return NextResponse.json(
      {
        ok: false,
        data: [],
        meta: { ok: false, count: 0, err: "Missing ?collection" },
        err: "Missing ?collection",
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase.rpc(
      "get_colors_by_collection_v2" as never,
      { p_collection: collection } as never,
    );

    if (error) {
      throw error;
    }

    const rows = Array.isArray(data) ? data : [];
    const mapped = rows
      .map((row) => {
        if (!row) return null;
        if (typeof row === "string") {
          const value = (row as string).trim();
          return value ? { value, label: value } : null;
        }
        const raw =
          typeof row === "object"
            ? (row as Record<string, unknown>).color ??
              (row as Record<string, unknown>).color_name ??
              (row as Record<string, unknown>).value ??
              (row as Record<string, unknown>).label ??
              null
            : null;
        if (!raw || typeof raw !== "string") return null;
        const value = raw.trim();
        return value ? { value, label: value } : null;
      })
      .filter((entry): entry is { value: string; label: string } => Boolean(entry));

    return NextResponse.json({
      ok: true,
      data: mapped,
      meta: { ok: true, count: mapped.length },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        data: [],
        meta: {
          ok: false,
          count: 0,
          err: `getColorsByCollection failed: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`,
        },
        err: String(error),
      },
      { status: 502 },
    );
  }
}
