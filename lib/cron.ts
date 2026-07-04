import { NextResponse } from "next/server";

/*
  Shared guard for /api/cron/* routes. n8n (running locally) calls these
  with the x-cron-key header; the value lives in CRON_SECRET in .env.local.
  If CRON_SECRET is unset the routes refuse to run, so they can never be
  triggered unauthenticated by accident.
*/
export function checkCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on the server" },
      { status: 503 }
    );
  }
  if (request.headers.get("x-cron-key") !== secret) {
    return NextResponse.json({ error: "Invalid cron key" }, { status: 401 });
  }
  return null;
}
