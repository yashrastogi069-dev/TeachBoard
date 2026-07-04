import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aiJson } from "@/lib/ai/provider";
import { reportEvent } from "@/lib/notify";

export const maxDuration = 300;

/*
  Strict rubric grading. The AI awards points per criterion (0..weight) with
  a justification and a concrete fix; the numeric total is computed here,
  never trusted from the model. Failing grades create a revision
  recommendation; passing grades advance the path and settle the module
  deadline.
*/

const gradeSchema = z.object({
  overallFeedback: z.string().min(1),
  criteria: z
    .array(
      z.object({
        criterion: z.string().min(1),
        awarded: z.number().min(0),
        weight: z.number().min(1),
        justification: z.string().min(1),
        fix: z.string().min(1),
      })
    )
    .min(1),
  strengths: z.array(z.string()).max(5),
  nextSteps: z.array(z.string()).min(1).max(5),
});

interface RubricCriterion {
  criterion: string;
  weight: number;
  description: string;
}

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let assessmentId = "";
  let answer = "";
  try {
    const body = await request.json();
    assessmentId = String(body.assessmentId ?? "");
    answer = String(body.answer ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!assessmentId || answer.length < 50) {
    return NextResponse.json(
      { error: "Write a real attempt first (at least 50 characters)." },
      { status: 400 }
    );
  }

  const admin = supabaseAdmin();
  let submissionId: string | null = null;

  try {
    const { data: assessment } = await admin
      .from("assessments")
      .select(
        "id, title, brief, rubric, type, max_score, pass_threshold, module_id, modules(title, track_id, skill_tracks(id, title))"
      )
      .eq("id", assessmentId)
      .single();
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }
    const moduleInfo = assessment.modules as unknown as {
      title: string;
      skill_tracks: { id: string; title: string };
    };
    const rubric = (assessment.rubric ?? []) as RubricCriterion[];

    const { count } = await admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("assessment_id", assessmentId)
      .eq("user_id", user.id);
    const attemptNo = (count ?? 0) + 1;

    const { data: created, error: insertErr } = await admin
      .from("submissions")
      .insert({
        assessment_id: assessmentId,
        user_id: user.id,
        attempt_no: attemptNo,
        answer,
        status: "grading",
      })
      .select("id")
      .single();
    if (insertErr || !created) throw new Error(insertErr?.message ?? "submission insert failed");
    submissionId = created.id;

    const rubricText = rubric
      .map(
        (r, i) =>
          `${i + 1}. "${r.criterion}" (max ${r.weight} points): ${r.description}`
      )
      .join("\n");

    const graded = await aiJson(
      gradeSchema,
      `You are a strict but fair examiner for practical corporate-skills work.
You grade like a demanding manager reviewing a junior's deliverable: points are
EARNED by specific, correct, applied content in the answer, never by vague
gestures at the right idea. Quote or reference the answer in every justification.
If a criterion is not addressed at all, award 0 for it and say so plainly.
Every "fix" must be a concrete action the learner can take in the retry.`,
      `Assessment: "${assessment.title}" (module "${moduleInfo.title}", course "${moduleInfo.skill_tracks.title}")

Task brief given to the learner:
${assessment.brief}

Rubric (award integer points from 0 up to each criterion's max):
${rubricText}

Learner's submission (attempt ${attemptNo}):
---
${answer.slice(0, 8000)}
---

Return JSON: {"overallFeedback":"2-4 sentences, direct and specific","criteria":[{"criterion":"exact rubric criterion text","awarded":number,"weight":number matching the rubric max,"justification":"why this score, referencing the answer","fix":"concrete improvement action"}],"strengths":["..."],"nextSteps":["..."]}
Include every rubric criterion exactly once.`,
      "api/grade"
    );

    // Compute the total ourselves; clamp awarded into [0, weight].
    const weightByCriterion = new Map(rubric.map((r) => [r.criterion.toLowerCase(), r.weight]));
    let totalAwarded = 0;
    let totalWeight = 0;
    const normalized = graded.criteria.map((c) => {
      const weight =
        weightByCriterion.get(c.criterion.toLowerCase()) ?? Math.max(1, c.weight);
      const awarded = Math.max(0, Math.min(weight, c.awarded));
      totalAwarded += awarded;
      totalWeight += weight;
      return { ...c, awarded, weight };
    });
    const score = totalWeight > 0 ? Math.round((totalAwarded / totalWeight) * 100) : 0;
    const passed = score >= assessment.pass_threshold;

    await admin
      .from("submissions")
      .update({
        score,
        rubric_scores: normalized,
        feedback: {
          overallFeedback: graded.overallFeedback,
          strengths: graded.strengths,
          nextSteps: graded.nextSteps,
        },
        status: "graded",
      })
      .eq("id", submissionId);

    await admin.from("activity_log").insert({
      user_id: user.id,
      kind: "submission",
      ref_id: assessmentId,
      minutes: 20,
    });

    // Recommendations: remediation on fail, momentum on pass.
    const worst = [...normalized].sort(
      (a, b) => a.awarded / a.weight - b.awarded / b.weight
    )[0];
    if (!passed && worst) {
      await admin.from("recommendations").insert({
        user_id: user.id,
        kind: "revision",
        text: `"${assessment.title}" scored ${score} (pass is ${assessment.pass_threshold}). Biggest gap: ${worst.criterion}. ${worst.fix}`,
        track_id: moduleInfo.skill_tracks.id,
      });
    } else if (passed) {
      await admin.from("recommendations").insert({
        user_id: user.id,
        kind: "next_module",
        text: `You passed "${assessment.title}" with ${score}. Keep the momentum: open the next module in ${moduleInfo.skill_tracks.title}.`,
        track_id: moduleInfo.skill_tracks.id,
      });
      await admin
        .from("deadlines")
        .update({ status: "met" })
        .eq("user_id", user.id)
        .eq("module_id", assessment.module_id)
        .eq("status", "active");
    }

    return NextResponse.json({
      submissionId,
      attemptNo,
      score,
      passed,
      passThreshold: assessment.pass_threshold,
      criteria: normalized,
      overallFeedback: graded.overallFeedback,
      strengths: graded.strengths,
      nextSteps: graded.nextSteps,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Grading failed";
    if (submissionId) {
      await admin.from("submissions").update({ status: "error" }).eq("id", submissionId);
    }
    await reportEvent("error", "api/grade", `${assessmentId}: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
