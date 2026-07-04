import Link from "next/link";
import { CheckCircle, Circle } from "@phosphor-icons/react/dist/ssr";
import { supabaseServer } from "@/lib/supabase/server";
import Panel from "@/components/ui/Panel";
import ProgressRing from "@/components/ui/ProgressRing";
import { getTrack } from "@/lib/tracks";

interface ModuleRow {
  id: string;
  slug: string;
  title: string;
  sort_order: number;
  track_id: string;
  lessons: Array<{ id: string; title: string; sort_order: number }>;
}

export default async function ProgressPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: trackRows } = await supabase
    .from("skill_tracks")
    .select("id, slug, title, accent, active, sort_order")
    .eq("active", true)
    .order("sort_order");
  const tracks = trackRows ?? [];

  const { data: moduleRows } = await supabase
    .from("modules")
    .select("id, slug, title, sort_order, track_id, lessons(id, title, sort_order)")
    .order("sort_order");
  const modules = (moduleRows ?? []) as unknown as ModuleRow[];

  const { data: progressRows } = await supabase
    .from("progress")
    .select("lesson_id, status, mastery")
    .eq("user_id", user.id);
  const progressByLesson = new Map((progressRows ?? []).map((p) => [p.lesson_id, p]));

  const { data: submissionRows } = await supabase
    .from("submissions")
    .select("id, score, status, attempt_no, created_at, assessments(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: activityRows } = await supabase
    .from("activity_log")
    .select("minutes")
    .eq("user_id", user.id);
  const totalMinutes = (activityRows ?? []).reduce((s, a) => s + a.minutes, 0);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3 leading-tight">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Progress</h1>
          <p className="pt-1 text-sm text-ink-muted">
            Every lesson, module, and graded attempt in one place.
          </p>
        </div>
        <p className="tabular rounded-full border border-line bg-bg-raised px-3 py-1.5 text-xs text-ink-muted">
          {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total learning time
        </p>
      </header>

      {tracks.map((track) => {
        const staticTrack = getTrack(track.slug);
        const trackModules = modules.filter((m) => m.track_id === track.id);
        const lessonIds = trackModules.flatMap((m) => m.lessons.map((l) => l.id));
        const masterySum = lessonIds.reduce((sum, id) => {
          const p = progressByLesson.get(id);
          return sum + (p?.status === "completed" ? Number(p.mastery) : 0);
        }, 0);
        const trackMastery =
          lessonIds.length > 0 ? Math.round(masterySum / lessonIds.length) : 0;

        return (
          <div key={track.id} data-accent={staticTrack?.accent}>
            <Panel
              title={track.title}
              subtitle={
                trackModules.length === 0
                  ? "Course not generated yet. Open the track to build it."
                  : `${trackModules.length} modules`
              }
              action={<ProgressRing value={trackMastery} size={52} strokeWidth={4} />}
            >
              {trackModules.length === 0 ? (
                <Link
                  href={`/tracks/${track.slug}`}
                  className="inline-block rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97]"
                >
                  Open {track.title}
                </Link>
              ) : (
                <div className="flex flex-col gap-3">
                  {trackModules.map((mod) => {
                    const done = mod.lessons.filter(
                      (l) => progressByLesson.get(l.id)?.status === "completed"
                    ).length;
                    return (
                      <div key={mod.id} className="rounded-xl border border-line bg-bg/40 p-3">
                        <div className="flex items-baseline justify-between gap-3 pb-2">
                          <p className="text-xs font-medium text-ink">{mod.title}</p>
                          <p className="tabular shrink-0 text-[11px] text-ink-faint">
                            {done}/{mod.lessons.length} lessons
                          </p>
                        </div>
                        <ul className="flex flex-col gap-1">
                          {mod.lessons
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((lesson) => {
                              const p = progressByLesson.get(lesson.id);
                              const complete = p?.status === "completed";
                              return (
                                <li
                                  key={lesson.id}
                                  className="flex items-center gap-2 text-[11px] text-ink-muted"
                                >
                                  {complete ? (
                                    <CheckCircle
                                      size={12}
                                      weight="fill"
                                      className="shrink-0 text-success"
                                    />
                                  ) : (
                                    <Circle size={12} className="shrink-0 text-ink-faint" />
                                  )}
                                  <span className="min-w-0 truncate">{lesson.title}</span>
                                  {complete && (
                                    <span className="tabular ml-auto shrink-0 text-success">
                                      {Math.round(Number(p?.mastery ?? 0))}%
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>
        );
      })}

      <Panel
        title="Graded attempts"
        subtitle="Latest 20 submissions across all practical tests."
      >
        {(submissionRows ?? []).length === 0 ? (
          <p className="rounded-xl border border-line bg-bg/40 p-4 text-xs text-ink-faint">
            No submissions yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {(submissionRows ?? []).map((s) => {
              const a = s.assessments as unknown as { title: string } | null;
              const score = s.score === null ? null : Math.round(Number(s.score));
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 text-xs text-ink-muted"
                >
                  <span className="min-w-0 truncate">
                    {a?.title ?? "Assessment"} · attempt {s.attempt_no} ·{" "}
                    {new Date(s.created_at).toLocaleDateString("en-NZ", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {s.status === "graded" && score !== null ? (
                    <span
                      className={`tabular shrink-0 font-semibold ${
                        score >= 70 ? "text-success" : "text-warning"
                      }`}
                    >
                      {score}/100
                    </span>
                  ) : (
                    <span className="shrink-0 text-ink-faint">{s.status}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
