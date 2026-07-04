import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ensureCurriculum } from "@/lib/curriculum";
import { reportEvent } from "@/lib/notify";

export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let trackSlug = "";
  try {
    const body = await request.json();
    trackSlug = String(body.trackSlug ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!trackSlug) {
    return NextResponse.json({ error: "trackSlug is required" }, { status: 400 });
  }

  try {
    const result = await ensureCurriculum(trackSlug);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Curriculum generation failed";
    await reportEvent("error", "api/curriculum", `${trackSlug}: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
