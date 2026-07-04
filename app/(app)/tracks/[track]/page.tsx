import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle,
  CircleDashed,
  Exam,
  Lock,
} from "@phosphor-icons/react/dist/ssr";
import { supabaseServer } from "@/lib/supabase/server";
import GenerateCurriculum from "@/components/track/GenerateCurriculum";
import ProgressRing from "@/components/ui/ProgressRing";

interface ModuleRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  difficulty: string;
  sort_order: number;
  est_minutes: number;
  lessons: Array<{ id: string }>;
  assessments: Array<{ id: string }>;
}

export default async function TrackPage(props: PageProps<"/tracks/[track]">) {
  const { track: trackSlug } = await props.params;
  const supabase = await supabaseServer();

  const { data: track } = await supabase
    .from("skill_tracks")
    .select("id, slug, title, tagline, accent, active")
    .eq("slug", trackSlug)
    .maybeSingle();
  if (!track || !track.active) notFound();

  const { data: modulesData } = await supabase
    .from("modules")
    .select("id, slug, title, summary, difficulty, sort_order, est_minutes, lessons(id), assessments(id)")
    .eq("track_id", track.id)
    .order("sort_order");
  const modules = (modulesData ?? []) as unknown as ModuleRow[];

  // Per-module completion from the user's progress rows.
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: progressRows } = lessonIds.length
    ? await supabase
        .from("progress")
        .select("lesson_id, status, mastery")
        .eq("user_id", user?.id ?? "")
        .in("lesson_id", lessonIds)
    : { data: [] as Array<{ lesson_id: string; status: string; mastery: number }> };

  const doneByLesson = new Map(
    (progressRows ?? []).map((p) => [p.lesson_id, p.status === "completed"])
  );
  const masteryValues = (progressRows ?? [])
    .filter((p) => p.status === "completed")
    .map((p) => Number(p.mastery));
  const trackMastery =
    lessonIds.length > 0
      ? Math.round(
          masteryValues.reduce((a, b) => a + b, 0) / Math.max(lessonIds.length, 1)
        )
      : 0;

  let firstIncompleteSeen = false;

  return (
    <div data-accent={track.accent} className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="leading-tight">
          <h1 className="font-display text-xl font-semibold text-ink">{track.title}</h1>
          <p className="pt-1 text-sm text-ink-muted">{track.tagline}</p>
        </div>
        {modules.length > 0 && <ProgressRing value={trackMastery} size={64} strokeWidth={5} />}
      </header>

      {modules.length === 0 ? (
        <GenerateCurriculum trackSlug={track.slug} />
      ) : (
        <ol className="flex flex-col gap-3">
          {modules.map((mod, index) => {
            const total = mod.lessons.length;
            const done = mod.lessons.filter((l) => doneByLesson.get(l.id)).length;
            const complete = total > 0 && done === total;
            const isCurrent = !complete && !firstIncompleteSeen;
            if (isCurrent) firstIncompleteSeen = true;
            return (
              <li key={mod.id}>
                <Link
                  href={`/tracks/${track.slug}/${mod.slug}`}
                  className={`flex items-start gap-4 rounded-2xl border p-5 transition-colors duration-150 ${
                    isCurrent
                      ? "border-accent/40 bg-bg-raised/70"
                      : "border-line bg-bg-raised/50 hover:border-line-strong"
                  }`}
                  style={
                    isCurrent ? { boxShadow: "0 0 36px -14px var(--accent-glow)" } : undefined
                  }
                >
                  <span
                    className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border ${
                      complete
                        ? "border-accent/40 bg-accent-soft text-accent"
                        : isCurrent
                          ? "border-accent/60 bg-accent-soft text-accent-bright"
                          : "border-line bg-bg-overlay text-ink-faint"
                    }`}
                  >
                    {complete ? (
                      <CheckCircle size={18} weight="fill" />
                    ) : isCurrent ? (
                      <CircleDashed size={18} weight="duotone" />
                    ) : (
                      <Lock size={15} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium text-ink">
                        {index + 1}. {mod.title}
                      </span>
                      <span className="rounded-md bg-bg-overlay px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-faint">
                        {mod.difficulty}
                      </span>
                    </span>
                    <span className="block pt-1 text-xs text-ink-muted">{mod.summary}</span>
                    <span className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-ink-faint">
                      <span className="tabular">
                        {done}/{total} lessons
                      </span>
                      <span className="flex items-center gap-1">
                        <Exam size={12} className="text-accent" />
                        {mod.assessments.length} practical test
                        {mod.assessments.length === 1 ? "" : "s"}
                      </span>
                      <span className="tabular">~{mod.est_minutes} min</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
