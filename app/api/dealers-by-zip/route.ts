import { NextRequest, NextResponse } from "next/server";
import { getDealersByZipSafe } from "@/lib/mbic-supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const zipCode = searchParams.get("zipCode");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!zipCode || !from || !to) {
    return NextResponse.json(
      { error: "zipCode, from, and to parameters are required" },
      { status: 400 }
    );
  }

  const result = await getDealersByZipSafe(zipCode, from, to);

  return NextResponse.json(result.data);
}
