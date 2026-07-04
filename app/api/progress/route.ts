import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { reportEvent } from "@/lib/notify";

/*
  Marks a lesson complete with its mastery score and logs the activity.
  Also seeds a soft deadline for the module the first time the user touches
  it (due in 7 days) so the dashboard always has something real to show.
*/
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let lessonId = "";
  let mastery = 0;
  let minutes = 0;
  try {
    const body = await request.json();
    lessonId = String(body.lessonId ?? "");
    mastery = Math.max(0, Math.min(100, Number(body.mastery ?? 0)));
    minutes = Math.max(0, Math.min(240, Math.round(Number(body.minutes ?? 0))));
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
  }

  try {
    const { error: upsertErr } = await supabase.from("progress").upsert({
      user_id: user.id,
      lesson_id: lessonId,
      status: "completed",
      mastery,
      updated_at: new Date().toISOString(),
    });
    if (upsertErr) throw new Error(upsertErr.message);

    await supabase.from("activity_log").insert({
      user_id: user.id,
      kind: "lesson",
      ref_id: lessonId,
      minutes,
    });

    // Seed a module deadline on first activity in that module.
    const { data: lesson } = await supabase
      .from("lessons")
      .select("module_id, modules(title)")
      .eq("id", lessonId)
      .single();
    if (lesson?.module_id) {
      const { count } = await supabase
        .from("deadlines")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("module_id", lesson.module_id);
      if ((count ?? 0) === 0) {
        const due = new Date(Date.now() + 7 * 86400_000);
        const moduleTitle =
          (lesson.modules as unknown as { title: string } | null)?.title ?? "module";
        await supabase.from("deadlines").insert({
          user_id: user.id,
          module_id: lesson.module_id,
          title: `Complete ${moduleTitle}`,
          due_date: due.toISOString().slice(0, 10),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Progress save failed";
    await reportEvent("error", "api/progress", `${lessonId}: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
