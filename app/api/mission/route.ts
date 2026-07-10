import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aiJson } from "@/lib/ai/provider";
import { reportEvent } from "@/lib/notify";

export const maxDuration = 300;

/*
  Mission run persistence + AI expert review (AGENTS.md mission chain: mission
  briefing -> branching simulation -> reflection -> expert review). Two
  actions behind one route, discriminated by "action":
  - "save": persists the learner's branching-simulation path and metrics.
  - "review": has the mission's expert persona critique each decision the
    learner actually made against the rubric, like a senior practitioner
    reviewing a junior's work, then attaches the review to the saved run
    when a runId is given.
*/

const pathStepSchema = z.object({
  stageId: z.string().min(1),
  choiceId: z.string().min(1),
  quality: z.enum(["best", "good", "poor"]),
});

const metricsSchema = z.object({
  trajectory: z.array(z.record(z.string(), z.number())).min(1),
  finals: z.record(z.string(), z.number()),
});

const saveBodySchema = z.object({
  action: z.literal("save"),
  lessonId: z.string().min(1),
  blockIndex: z.number().int().min(0),
  path: z.array(pathStepSchema).min(1),
  metrics: metricsSchema,
  reflection: z.string().optional(),
  outcome: z.enum(["success", "partial", "failed"]),
  variant: z.number().int().min(0),
  mastery: z.number().int().min(0).max(100),
});

const decisionSchema = z.object({
  situation: z.string().min(1),
  chosenLabel: z.string().min(1),
  quality: z.enum(["best", "good", "poor"]),
  feedback: z.string().min(1),
});

const reviewBodySchema = z.object({
  action: z.literal("review"),
  lessonId: z.string().min(1),
  blockIndex: z.number().int().min(0),
  runId: z.string().min(1).optional(),
  persona: z.string().min(1),
  rubric: z.array(z.string().min(1)).min(1),
  missionTitle: z.string().min(1),
  decisions: z.array(decisionSchema).min(1),
  reflection: z.string().optional(),
  finals: z.record(z.string(), z.number()),
});

const whiteboardNoteSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  x: z.number(),
  y: z.number(),
});

const whiteboardConnectionSchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
});

const whiteboardReviewBodySchema = z.object({
  action: z.literal("whiteboard-review"),
  lessonId: z.string().min(1),
  blockIndex: z.number().int().min(0),
  persona: z.string().min(1),
  rubric: z.array(z.string().min(1)).min(1),
  prompt: z.string().min(1),
  notes: z.array(whiteboardNoteSchema).min(2),
  connections: z.array(whiteboardConnectionSchema).min(1),
});

const requestSchema = z.discriminatedUnion("action", [
  saveBodySchema,
  reviewBodySchema,
  whiteboardReviewBodySchema,
]);

const reviewResultSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string().min(1),
  perDecision: z
    .array(
      z.object({
        verdict: z.enum(["strong", "acceptable", "weak"]),
        critique: z.string().min(1),
      })
    )
    .min(1),
});

const whiteboardReviewResultSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string().min(1),
  feedback: z
    .array(
      z.object({
        targetId: z.string().min(1),
        comment: z.string().min(1),
      })
    )
    .min(1),
});

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let parsed: z.infer<typeof requestSchema>;
  try {
    const body = await request.json();
    const validated = requestSchema.safeParse(body);
    if (!validated.success) {
      const detail = validated.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return NextResponse.json({ error: `Invalid request: ${detail}` }, { status: 400 });
    }
    parsed = validated.data;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: lesson } = await admin
    .from("lessons")
    .select("id")
    .eq("id", parsed.lessonId)
    .maybeSingle();
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  if (parsed.action === "save") {
    try {
      const { data: created, error: insertErr } = await admin
        .from("mission_runs")
        .insert({
          user_id: user.id,
          lesson_id: parsed.lessonId,
          block_index: parsed.blockIndex,
          path: parsed.path,
          metrics: parsed.metrics,
          reflection: parsed.reflection ?? null,
          outcome: parsed.outcome,
          variant: parsed.variant,
          mastery: parsed.mastery,
        })
        .select("id")
        .single();
      if (insertErr || !created) {
        throw new Error(insertErr?.message ?? "mission_runs insert failed");
      }

      await admin.from("activity_log").insert({
        user_id: user.id,
        kind: "mission",
        ref_id: parsed.lessonId,
        minutes: 10,
      });

      return NextResponse.json({ ok: true, runId: created.id as string });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mission save failed";
      await reportEvent("error", "api/mission", `save ${parsed.lessonId}: ${message}`);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (parsed.action === "whiteboard-review") {
    try {
      const noteText = new Map(parsed.notes.map((n) => [n.id, n.text]));
      const notesText = parsed.notes
        .map((n) => `- (${n.id}) "${n.text}" placed at x=${Math.round(n.x)}, y=${Math.round(n.y)}`)
        .join("\n");
      const connectionsText = parsed.connections
        .map((c) => {
          const from = noteText.get(c.fromId) ?? c.fromId;
          const to = noteText.get(c.toId) ?? c.toId;
          return `- ${c.fromId}->${c.toId}: "${from}" leads to "${to}"`;
        })
        .join("\n");
      const rubricText = parsed.rubric.map((r, i) => `${i + 1}. ${r}`).join("\n");

      const reviewed = await aiJson(
        whiteboardReviewResultSchema,
        `You are ${parsed.persona}, reviewing a junior colleague's actual whiteboard: the sticky
notes they wrote and the connections they drew between them to model a concept. You are
demanding but fair. You critique what is ACTUALLY on their board, never a generic textbook
answer. Judge how well the notes and their relationships satisfy the rubric. For each piece of
feedback, name the specific note or connection you are addressing and say, in 1-3 sentences,
what a senior practitioner would add, remove, relabel, or reconnect and why it matters.
Then give an overall score from 0 to 100 and a 2-4 sentence summary naming the single most
important improvement. Never invent notes or links the learner did not place.`,
        `The exercise prompt the learner was answering:
${parsed.prompt}

Rubric a strong board satisfies:
${rubricText}

Notes on the board:
${notesText}

Connections drawn (from -> to):
${connectionsText}

Return JSON: {"score": number from 0 to 100, "summary": "2-4 sentences naming the single most important improvement", "feedback": [{"targetId": "the exact note id being critiqued, or a connection written as fromId->toId", "comment": "1-3 sentences specific to that note or connection"}]}
Give feedback on the most important notes and at least one connection. Every targetId must be a note id listed above or a connection written as fromId->toId using ids listed above.`,
        "api/mission/whiteboard-review"
      );

      return NextResponse.json({
        ok: true,
        score: reviewed.score,
        summary: reviewed.summary,
        feedback: reviewed.feedback,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Whiteboard review failed";
      await reportEvent("error", "api/mission", `whiteboard-review ${parsed.lessonId}: ${message}`);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // action === "review"
  let runId: string | null = null;
  try {
    if (parsed.runId) {
      const { data: run } = await admin
        .from("mission_runs")
        .select("user_id")
        .eq("id", parsed.runId)
        .maybeSingle();
      if (!run || run.user_id !== user.id) {
        return NextResponse.json({ error: "Mission run not found" }, { status: 404 });
      }
      runId = parsed.runId;
    }

    const decisionsText = parsed.decisions
      .map(
        (d, i) =>
          `${i + 1}. Situation: ${d.situation}\n   Learner chose: "${d.chosenLabel}" (logged quality: ${d.quality})\n   Immediate consequence shown to the learner: ${d.feedback}`
      )
      .join("\n\n");
    const rubricText = parsed.rubric.map((r, i) => `${i + 1}. ${r}`).join("\n");
    const finalsText =
      Object.entries(parsed.finals)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ") || "none recorded";

    const reviewed = await aiJson(
      reviewResultSchema,
      `You are ${parsed.persona}, reviewing a junior colleague's actual decisions in a
realistic work simulation called "${parsed.missionTitle}". You are demanding but fair:
you critique what was ACTUALLY chosen, never a generic textbook answer. For each
decision, judge it against the rubric below, give a verdict of "strong", "acceptable",
or "weak", and in 1-3 sentences say specifically what a senior practitioner would have
done differently and why it matters in real work. Then give an overall score from 0 to
100 and a 2-4 sentence summary naming the single most important improvement for next
time. Never invent details the learner was not shown.`,
      `Rubric a strong performance satisfies:
${rubricText}

Final outcome metrics: ${finalsText}
${parsed.reflection ? `\nLearner's own reflection on the mission:\n${parsed.reflection}\n` : ""}
Decisions made, in order:

${decisionsText}

Return JSON: {"score": number from 0 to 100, "summary": "2-4 sentences, name the single most important improvement", "perDecision": [{"verdict": "strong" | "acceptable" | "weak", "critique": "1-3 sentences, specific to what was chosen"}]}
Include exactly ${parsed.decisions.length} entries in perDecision, in the same order as the decisions listed above.`,
      "api/mission/review"
    );

    let perDecision = reviewed.perDecision;
    if (perDecision.length !== parsed.decisions.length) {
      await reportEvent(
        "warning",
        "api/mission/review",
        `AI returned ${perDecision.length} perDecision entries for ${parsed.decisions.length} decisions; padding/truncating to match`
      );
      if (perDecision.length < parsed.decisions.length) {
        const pad = parsed.decisions.slice(perDecision.length).map(() => ({
          verdict: "acceptable" as const,
          critique: "No specific critique was returned for this decision.",
        }));
        perDecision = [...perDecision, ...pad];
      } else {
        perDecision = perDecision.slice(0, parsed.decisions.length);
      }
    }

    const result = { score: reviewed.score, summary: reviewed.summary, perDecision };

    if (runId) {
      await admin
        .from("mission_runs")
        .update({ expert_review: result, mastery: Math.round(reviewed.score) })
        .eq("id", runId);
    }

    return NextResponse.json({ ok: true, runId, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mission review failed";
    await reportEvent("error", "api/mission", `review ${parsed.lessonId}: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
