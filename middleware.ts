import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const secret = process.env.RETELL_AI_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "RETELL_AI_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return NextResponse.json(
      { error: "Missing authorization header" },
      { status: 401 },
    );
  }

  if (token !== secret) {
    return NextResponse.json(
      { error: "Invalid authorization signature" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/salesdata",
};
