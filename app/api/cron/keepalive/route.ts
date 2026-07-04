import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportEvent } from "@/lib/notify";
import { checkCronAuth } from "@/lib/cron";

/*
  Daily ping that keeps the Supabase free-tier project from pausing after
  7 idle days. Called by the n8n keep-alive workflow.
*/
export async function POST(request: Request) {
  const denied = checkCronAuth(request);
  if (denied) return denied;

  try {
    const { error } = await supabaseAdmin()
      .from("skill_tracks")
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    await reportEvent("info", "n8n/keep-alive", "Supabase keep-alive ping OK.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "keep-alive failed";
    await reportEvent("error", "n8n/keep-alive", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
