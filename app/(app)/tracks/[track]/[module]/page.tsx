import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  CheckCircle,
  Circle,
  Exam,
} from "@phosphor-icons/react/dist/ssr";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ModulePage(props: PageProps<"/tracks/[track]/[module]">) {
  const { track: trackSlug, module: moduleSlug } = await props.params;
  const supabase = await supabaseServer();

  const { data: track } = await supabase
    .from("skill_tracks")
    .select("id, slug, title, accent")
    .eq("slug", trackSlug)
    .maybeSingle();
  if (!track) notFound();

  const { data: mod } = await supabase
    .from("modules")
    .select("id, slug, title, summary, difficulty, est_minutes")
    .eq("track_id", track.id)
    .eq("slug", moduleSlug)
    .maybeSingle();
  if (!mod) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, slug, title, sort_order")
    .eq("module_id", mod.id)
    .order("sort_order");

  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, type, title, brief")
    .eq("module_id", mod.id)
    .order("sort_order");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lessonIds = (lessons ?? []).map((l) => l.id);
  const { data: progressRows } = lessonIds.length
    ? await supabase
        .from("progress")
        .select("lesson_id, status, mastery")
        .eq("user_id", user?.id ?? "")
        .in("lesson_id", lessonIds)
    : { data: [] as Array<{ lesson_id: string; status: string; mastery: number }> };
  const progressByLesson = new Map((progressRows ?? []).map((p) => [p.lesson_id, p]));

  const { data: submissions } = user
    ? await supabase
        .from("submissions")
        .select("assessment_id, score, status")
        .eq("user_id", user.id)
        .in("assessment_id", (assessments ?? []).map((a) => a.id))
        .order("created_at", { ascending: false })
    : { data: [] };
  const latestByAssessment = new Map<string, { score: number | null; status: string }>();
  for (const s of submissions ?? []) {
    if (!latestByAssessment.has(s.assessment_id)) {
      latestByAssessment.set(s.assessment_id, { score: s.score, status: s.status });
    }
  }

  return (
    <div data-accent={track.accent} className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <nav className="text-[11px] text-ink-faint">
        <Link href={`/tracks/${track.slug}`} className="transition-colors hover:text-ink">
          {track.title}
        </Link>{" "}
        / <span className="text-ink-muted">{mod.title}</span>
      </nav>

      <header className="leading-tight">
        <h1 className="font-display text-xl font-semibold text-ink">{mod.title}</h1>
        <p className="pt-1 text-sm text-ink-muted">{mod.summary}</p>
        <p className="tabular pt-2 text-[11px] uppercase tracking-wider text-ink-faint">
          {mod.difficulty} · ~{mod.est_minutes} min
        </p>
      </header>

      <section>
        <h2 className="pb-2 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
          Lessons
        </h2>
        <ol className="flex flex-col gap-2">
          {(lessons ?? []).map((lesson, i) => {
            const p = progressByLesson.get(lesson.id);
            const complete = p?.status === "completed";
            return (
              <li key={lesson.id}>
                <Link
                  href={`/tracks/${track.slug}/${mod.slug}/${lesson.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-bg-raised/50 p-4 transition-colors duration-150 hover:border-accent/40"
                >
                  {complete ? (
                    <CheckCircle size={18} weight="fill" className="shrink-0 text-success" />
                  ) : (
                    <Circle size={18} className="shrink-0 text-ink-faint" />
                  )}
                  <span className="min-w-0 flex-1 text-sm text-ink">
                    {i + 1}. {lesson.title}
                  </span>
                  {complete && (
                    <span className="tabular shrink-0 text-xs font-medium text-success">
                      {Math.round(Number(p?.mastery ?? 0))}%
                    </span>
                  )}
                  <BookOpen size={14} className="shrink-0 text-accent" weight="duotone" />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="pb-2 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
          Practical tests
        </h2>
        <div className="flex flex-col gap-2">
          {(assessments ?? []).map((assessment) => {
            const latest = latestByAssessment.get(assessment.id);
            return (
              <Link
                key={assessment.id}
                href={`/assess/${assessment.id}`}
                className="flex items-start gap-3 rounded-xl border border-line bg-bg-raised/50 p-4 transition-colors duration-150 hover:border-accent/40"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                  <Exam size={16} weight="duotone" />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-sm font-medium text-ink">
                    {assessment.title}
                  </span>
                  <span className="block pt-1 text-xs text-ink-muted">
                    {assessment.brief.slice(0, 140)}
                    {assessment.brief.length > 140 ? "..." : ""}
                  </span>
                </span>
                {latest && latest.score !== null && (
                  <span
                    className={`tabular shrink-0 text-sm font-semibold ${
                      Number(latest.score) >= 70 ? "text-success" : "text-warning"
                    }`}
                  >
                    {Math.round(Number(latest.score))}
                  </span>
                )}
              </Link>
            );
          })}
          {(assessments ?? []).length === 0 && (
            <p className="rounded-xl border border-line bg-bg/40 p-4 text-xs text-ink-faint">
              No practical tests in this module.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
