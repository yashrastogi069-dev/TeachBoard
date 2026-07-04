import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ensureLessonContent } from "@/lib/curriculum";
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

  let lessonId = "";
  try {
    const body = await request.json();
    lessonId = String(body.lessonId ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
  }

  try {
    const content = await ensureLessonContent(lessonId);
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lesson generation failed";
    await reportEvent("error", "api/lesson", `${lessonId}: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
