import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aiJson } from "@/lib/ai/provider";
import { research } from "@/lib/apis/research";
import { reportEvent } from "@/lib/notify";
import { lessonContentSchema, type LessonContent } from "@/lib/blocks";

/*
  Generate-once-cache-forever content engine (AGENTS.md rule 6).
  ensureCurriculum builds the module/lesson/assessment skeleton for a track;
  ensureLessonContent fills one lesson with artifact blocks on first open.
  Both are grounded in fresh research so the material reflects current
  practice, and both are idempotent.
*/

const curriculumSchema = z.object({
  modules: z
    .array(
      z.object({
        slug: z.string().min(1),
        title: z.string().min(1),
        summary: z.string().min(1),
        difficulty: z.enum(["basic", "advanced", "pro"]),
        estMinutes: z.number().int().min(20).max(600),
        lessons: z
          .array(z.object({ slug: z.string().min(1), title: z.string().min(1) }))
          .min(3)
          .max(5),
        assessments: z
          .array(
            z.object({
              type: z.enum(["scenario", "project", "quiz"]),
              title: z.string().min(1),
              brief: z.string().min(1),
              rubric: z
                .array(
                  z.object({
                    criterion: z.string().min(1),
                    weight: z.number().min(5).max(60),
                    description: z.string().min(1),
                  })
                )
                .min(3)
                .max(6),
            })
          )
          .min(1)
          .max(2),
      })
    )
    .min(5)
    .max(8),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const PROFESSOR = `You are the Praxis professor: a practical, no-fluff corporate skills
teacher for Yash, a Master of Management graduate in Auckland, New Zealand who is
hunting for entry-level marketing/analytics roles and wants skills he can apply at
work the same week. Teaching rules that are non-negotiable:
- CLARITY first: define every term in plain language before using it.
- Real-world and practical: every concept ties to a task someone actually does on
  the job (real tools, real reports, real client situations).
- Current: it is mid-2026; prefer the provided research snippets over stale habits.
- No fluff, no motivational filler, no fabricated statistics.`;

export async function ensureCurriculum(trackSlug: string): Promise<{
  trackId: string;
  moduleCount: number;
  generated: boolean;
}> {
  const admin = supabaseAdmin();
  const { data: track, error: trackErr } = await admin
    .from("skill_tracks")
    .select("id, slug, title, tagline, active")
    .eq("slug", trackSlug)
    .single();
  if (trackErr || !track) throw new Error(`Unknown track: ${trackSlug}`);
  if (!track.active) throw new Error(`Track ${trackSlug} is not active yet`);

  const { count } = await admin
    .from("modules")
    .select("id", { count: "exact", head: true })
    .eq("track_id", track.id);
  if ((count ?? 0) > 0) {
    return { trackId: track.id, moduleCount: count ?? 0, generated: false };
  }

  const sources = await research(
    `${track.title} skills curriculum what to learn ${new Date().getFullYear()} practical guide`,
    6
  );
  const sourceText = sources
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const curriculum = await aiJson(
    curriculumSchema,
    PROFESSOR,
    `Design the complete "${track.title}" course (${track.tagline}).

Fresh research snippets to ground module choices (use them, do not copy them):
${sourceText || "(research unavailable; rely on well-established practice)"}

Requirements:
- 6 modules ordered from zero-knowledge to job-ready: 2 basic, 2-3 advanced, 1-2 pro.
- Module summaries say what the learner can DO afterwards, in one sentence.
- Each module: 3-5 lesson titles that build on each other, and 1-2 assessments.
- Assessments are REAL work simulations (audit a site, plan a campaign on a budget,
  write the report a manager asked for), never trivia. Each has a rubric of 3-6
  criteria with weights that sum to roughly 100, each criterion described concretely.
- Slugs: short kebab-case.

Return JSON: {"modules":[{"slug","title","summary","difficulty":"basic|advanced|pro","estMinutes":number,"lessons":[{"slug","title"}],"assessments":[{"type":"scenario|project|quiz","title","brief","rubric":[{"criterion","weight","description"}]}]}]}`,
    `curriculum/${trackSlug}`
  );

  let sortModule = 0;
  for (const mod of curriculum.modules) {
    sortModule++;
    const { data: insertedModule, error: modErr } = await admin
      .from("modules")
      .insert({
        track_id: track.id,
        slug: slugify(mod.slug),
        title: mod.title,
        summary: mod.summary,
        difficulty: mod.difficulty,
        sort_order: sortModule,
        est_minutes: mod.estMinutes,
      })
      .select("id")
      .single();
    if (modErr || !insertedModule) {
      await reportEvent(
        "error",
        "curriculum",
        `Module insert failed for ${trackSlug}/${mod.slug}: ${modErr?.message}`
      );
      continue;
    }
    const lessonRows = mod.lessons.map((l, i) => ({
      module_id: insertedModule.id,
      slug: slugify(l.slug),
      title: l.title,
      sort_order: i + 1,
    }));
    const { error: lessonErr } = await admin.from("lessons").insert(lessonRows);
    if (lessonErr) {
      await reportEvent(
        "error",
        "curriculum",
        `Lesson insert failed for ${trackSlug}/${mod.slug}: ${lessonErr.message}`
      );
    }
    const assessmentRows = mod.assessments.map((a, i) => ({
      module_id: insertedModule.id,
      type: a.type,
      title: a.title,
      brief: a.brief,
      rubric: a.rubric,
      sort_order: i + 1,
    }));
    const { error: assessErr } = await admin.from("assessments").insert(assessmentRows);
    if (assessErr) {
      await reportEvent(
        "error",
        "curriculum",
        `Assessment insert failed for ${trackSlug}/${mod.slug}: ${assessErr.message}`
      );
    }
  }

  return { trackId: track.id, moduleCount: curriculum.modules.length, generated: true };
}

const BLOCK_PALETTE = `Available block types (use 6-12 blocks, mix at least 5 types):
- {"type":"text","markdown":"..."} plain teaching prose, short paragraphs
- {"type":"analogy","title":"...","markdown":"..."} everyday-life analogy that makes the concept click
- {"type":"worked-example","title":"...","markdown":"..."} a real task done step by step with real-looking numbers clearly labeled as examples
- {"type":"flowchart","title":"...","nodes":[{"id":"a","label":"..."}],"edges":[{"from":"a","to":"b","label":"..."}]} process diagram, 3-8 nodes
- {"type":"quiz","question":"...","options":["..."],"correctIndex":0,"explanation":"..."} check understanding
- {"type":"card-sort","title":"...","buckets":[{"id":"b1","label":"..."}],"cards":[{"id":"c1","label":"...","bucketId":"b1"}]} drag items into categories
- {"type":"slider-sim","title":"...","description":"...","inputLabel":"...","min":0,"max":100,"step":1,"unit":"...","outputs":[{"label":"...","unit":"...","base":0,"factor":1.5}]} output = base + factor * input; pick base/factor so the relationship teaches the tradeoff
- {"type":"compare","title":"...","goodLabel":"...","badLabel":"...","goodMarkdown":"...","badMarkdown":"..."} good vs bad example side by side
- {"type":"chart","title":"...","unit":"...","series":[{"label":"...","value":42}]} small bar comparison
- {"type":"video","title":"...","searchQuery":"..."} points to a video worth watching for this topic
- {"type":"scenario","prompt":"...","hint":"..."} an open situation the learner should reason about with the tutor`;

export async function ensureLessonContent(lessonId: string): Promise<LessonContent> {
  const admin = supabaseAdmin();
  const { data: lesson, error } = await admin
    .from("lessons")
    .select(
      "id, title, content, module_id, modules(title, difficulty, summary, track_id, skill_tracks(title, slug))"
    )
    .eq("id", lessonId)
    .single();
  if (error || !lesson) throw new Error(`Lesson not found: ${lessonId}`);

  if (lesson.content) {
    const cached = lessonContentSchema.safeParse(lesson.content);
    if (cached.success) return cached.data;
  }

  const moduleInfo = lesson.modules as unknown as {
    title: string;
    difficulty: string;
    summary: string;
    skill_tracks: { title: string; slug: string };
  };
  const trackTitle = moduleInfo.skill_tracks.title;

  const sources = await research(
    `${lesson.title} ${trackTitle} how it works practical guide`,
    5
  );
  const sourceText = sources
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const content = await aiJson(
    lessonContentSchema,
    PROFESSOR,
    `Write the full lesson "${lesson.title}" for the module "${moduleInfo.title}"
(${moduleInfo.difficulty} level) in the "${trackTitle}" course.

Fresh research snippets (ground the lesson in these where relevant):
${sourceText || "(research unavailable; rely on well-established practice)"}

Mandatory teaching sequence inside the blocks array:
1. define the concept in plain language (text)
2. one everyday analogy (analogy)
3. one worked practical example with concrete steps (worked-example)
4. at least one interactive artifact that SHOWS the concept (flowchart, slider-sim,
   card-sort, compare, or chart; pick what fits this topic best)
5. one check for understanding (quiz)
6. end with a scenario block the learner can discuss with the tutor

${BLOCK_PALETTE}

Also write "intro": 1-2 sentences on why this matters on the job.
Return JSON: {"intro":"...","blocks":[...]}`,
    `lesson/${lessonId.slice(0, 8)}`
  );

  const { error: updateErr } = await admin
    .from("lessons")
    .update({ content })
    .eq("id", lessonId);
  if (updateErr) {
    await reportEvent(
      "error",
      "curriculum",
      `Lesson content save failed for ${lessonId}: ${updateErr.message}`
    );
  }
  return content;
}
