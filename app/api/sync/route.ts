import { NextResponse } from "next/server";

const FUNCTION_URL = "https://sqhqzrtmjspwqqhnjtss.supabase.co/functions/v1/fetch-cpf-launchpad-marketing-data";

export async function POST() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
      { status: 500 },
    );
  }

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  const bodyText = await response.text();
  let payload: unknown;

  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    payload = bodyText;
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Manual sync failed",
        details: payload,
      },
      { status: response.status },
    );
  }

  return NextResponse.json({
    success: true,
    data: payload,
    syncedAt: new Date().toISOString(),
  });
}

export const dynamic = "force-dynamic";
