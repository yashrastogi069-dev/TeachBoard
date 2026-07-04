import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { lessonContentSchema, type LessonContent } from "@/lib/blocks";
import LessonPlayer from "@/components/lesson/LessonPlayer";

export default async function LessonPage(
  props: PageProps<"/tracks/[track]/[module]/[lesson]">
) {
  const { track: trackSlug, module: moduleSlug, lesson: lessonSlug } = await props.params;
  const supabase = await supabaseServer();

  const { data: track } = await supabase
    .from("skill_tracks")
    .select("id, slug, title, accent")
    .eq("slug", trackSlug)
    .maybeSingle();
  if (!track) notFound();

  const { data: mod } = await supabase
    .from("modules")
    .select("id, slug, title")
    .eq("track_id", track.id)
    .eq("slug", moduleSlug)
    .maybeSingle();
  if (!mod) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, slug, title, sort_order, content")
    .eq("module_id", mod.id)
    .order("sort_order");
  const list = lessons ?? [];
  const index = list.findIndex((l) => l.slug === lessonSlug);
  if (index === -1) notFound();
  const lesson = list[index];
  const next = list[index + 1] ?? null;

  let initialContent: LessonContent | null = null;
  if (lesson.content) {
    const parsed = lessonContentSchema.safeParse(lesson.content);
    if (parsed.success) initialContent = parsed.data;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: progressRow } = user
    ? await supabase
        .from("progress")
        .select("status, mastery")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson.id)
        .maybeSingle()
    : { data: null };

  return (
    <div data-accent={track.accent} className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <nav className="text-[11px] text-ink-faint">
        <Link href={`/tracks/${track.slug}`} className="transition-colors hover:text-ink">
          {track.title}
        </Link>{" "}
        /{" "}
        <Link
          href={`/tracks/${track.slug}/${mod.slug}`}
          className="transition-colors hover:text-ink"
        >
          {mod.title}
        </Link>{" "}
        / <span className="text-ink-muted">{lesson.title}</span>
      </nav>

      <LessonPlayer
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        initialContent={initialContent}
        alreadyCompleted={progressRow?.status === "completed"}
        previousMastery={progressRow ? Math.round(Number(progressRow.mastery)) : null}
        moduleHref={`/tracks/${track.slug}/${mod.slug}`}
        nextHref={next ? `/tracks/${track.slug}/${mod.slug}/${next.slug}` : null}
        nextTitle={next?.title ?? null}
      />
    </div>
  );
}
