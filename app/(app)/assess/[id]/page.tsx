import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import AssessmentWorkspace from "@/components/assess/AssessmentWorkspace";

interface RubricCriterion {
  criterion: string;
  weight: number;
  description: string;
}

export default async function AssessPage(props: PageProps<"/assess/[id]">) {
  const { id } = await props.params;
  const supabase = await supabaseServer();

  const { data: assessment } = await supabase
    .from("assessments")
    .select(
      "id, title, brief, rubric, type, pass_threshold, modules(slug, title, skill_tracks(slug, title, accent))"
    )
    .eq("id", id)
    .maybeSingle();
  if (!assessment) notFound();

  const moduleInfo = assessment.modules as unknown as {
    slug: string;
    title: string;
    skill_tracks: { slug: string; title: string; accent: string };
  };
  const track = moduleInfo.skill_tracks;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: attempts } = user
    ? await supabase
        .from("submissions")
        .select("id, attempt_no, score, status, created_at")
        .eq("assessment_id", assessment.id)
        .eq("user_id", user.id)
        .order("attempt_no", { ascending: false })
    : { data: [] };

  return (
    <div data-accent={track.accent} className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <nav className="text-[11px] text-ink-faint">
        <Link href={`/tracks/${track.slug}`} className="transition-colors hover:text-ink">
          {track.title}
        </Link>{" "}
        /{" "}
        <Link
          href={`/tracks/${track.slug}/${moduleInfo.slug}`}
          className="transition-colors hover:text-ink"
        >
          {moduleInfo.title}
        </Link>{" "}
        / <span className="text-ink-muted">Practical test</span>
      </nav>

      <AssessmentWorkspace
        assessmentId={assessment.id}
        title={assessment.title}
        brief={assessment.brief}
        rubric={(assessment.rubric ?? []) as RubricCriterion[]}
        passThreshold={assessment.pass_threshold}
        previousAttempts={(attempts ?? []).map((a) => ({
          id: a.id,
          attemptNo: a.attempt_no,
          score: a.score === null ? null : Math.round(Number(a.score)),
          status: a.status,
          dateLabel: new Date(a.created_at).toLocaleDateString("en-NZ", {
            day: "numeric",
            month: "short",
          }),
        }))}
      />
    </div>
  );
}
