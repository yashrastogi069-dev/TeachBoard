"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChatCircleDots,
  CheckCircle,
  Exam,
  Scales,
  WarningCircle,
} from "@phosphor-icons/react";
import Markdown from "@/components/artifacts/Markdown";
import { useTutor } from "@/components/shell/TutorContext";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

const GRADING_LINES = [
  "Reading your submission line by line...",
  "Scoring each rubric criterion...",
  "Writing specific feedback and fixes...",
];

interface RubricCriterion {
  criterion: string;
  weight: number;
  description: string;
}

interface GradedCriterion extends RubricCriterion {
  awarded: number;
  justification: string;
  fix: string;
}

interface GradeResult {
  score: number;
  passed: boolean;
  passThreshold: number;
  attemptNo: number;
  criteria: GradedCriterion[];
  overallFeedback: string;
  strengths: string[];
  nextSteps: string[];
}

interface PreviousAttempt {
  id: string;
  attemptNo: number;
  score: number | null;
  status: string;
  dateLabel: string;
}

export default function AssessmentWorkspace({
  assessmentId,
  title,
  brief,
  rubric,
  passThreshold,
  previousAttempts,
}: {
  assessmentId: string;
  title: string;
  brief: string;
  rubric: RubricCriterion[];
  passThreshold: number;
  previousAttempts: PreviousAttempt[];
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { openWithMessage } = useTutor();
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeLine, setGradeLine] = useState(0);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!grading) return;
    const timer = setInterval(
      () => setGradeLine((l) => Math.min(l + 1, GRADING_LINES.length - 1)),
      7000
    );
    return () => clearInterval(timer);
  }, [grading]);

  async function submit() {
    if (grading || answer.trim().length < 50) return;
    setGrading(true);
    setGradeLine(0);
    setError(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, answer }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Grading failed with status ${res.status}`);
      setResult(data as GradeResult);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grading failed");
    } finally {
      setGrading(false);
    }
  }

  function retry() {
    setResult(null);
    setAnswer("");
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <header className="leading-tight">
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-accent-bright">
          <Exam size={14} weight="duotone" /> Practical test · pass mark {passThreshold}
        </p>
        <h1 className="font-display pt-2 text-2xl font-semibold text-ink">{title}</h1>
      </header>

      <section className="rounded-2xl border border-line bg-bg-raised/60 p-5">
        <h2 className="pb-2 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
          Your brief
        </h2>
        <Markdown text={brief} />
      </section>

      <section className="rounded-2xl border border-line bg-bg/40 p-5">
        <h2 className="flex items-center gap-2 pb-3 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
          <Scales size={14} className="text-accent" /> How you will be scored
        </h2>
        <ul className="flex flex-col gap-2">
          {rubric.map((r) => (
            <li key={r.criterion} className="flex items-start gap-3 text-xs">
              <span className="tabular mt-0.5 shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 font-medium text-accent-bright">
                {r.weight}
              </span>
              <span className="leading-relaxed text-ink-muted">
                <span className="font-medium text-ink">{r.criterion}.</span> {r.description}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {!result && (
        <section className="rounded-2xl border border-line bg-bg-raised/60 p-5">
          <h2 className="pb-3 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
            Your submission
          </h2>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={grading}
            rows={12}
            placeholder="Do the work here as if a manager asked for it. Structure it, use real reasoning, show your numbers where relevant."
            className="w-full resize-y rounded-xl border border-line bg-bg/60 p-4 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              type="button"
              onClick={submit}
              disabled={grading || answer.trim().length < 50}
              className="rounded-xl bg-accent-soft px-6 py-2.5 text-sm font-medium text-accent-bright transition-transform duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {grading ? GRADING_LINES[gradeLine] : "Submit for grading"}
            </button>
            <span className="tabular text-[11px] text-ink-faint">
              {answer.trim().length} characters
              {answer.trim().length < 50 ? " (50 minimum)" : ""}
            </span>
          </div>
          {error && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <WarningCircle size={14} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
        </section>
      )}

      <AnimatePresence>
        {result && (
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className={`rounded-2xl border p-5 ${
              result.passed ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div className="leading-tight">
                <p className="text-[11px] font-medium uppercase tracking-widest text-ink-faint">
                  Attempt {result.attemptNo} result
                </p>
                <p
                  className={`font-display pt-1 text-3xl font-semibold ${
                    result.passed ? "text-success" : "text-warning"
                  }`}
                >
                  {result.score}
                  <span className="text-base font-normal text-ink-faint">/100</span>
                </p>
              </div>
              <p
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  result.passed ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}
              >
                {result.passed
                  ? "Passed. Real-world standard met."
                  : `Below the ${result.passThreshold} pass mark. Fix and retry.`}
              </p>
            </div>

            <p className="pb-4 text-sm leading-relaxed text-ink-muted">
              {result.overallFeedback}
            </p>

            <div className="flex flex-col gap-3">
              {result.criteria.map((c) => {
                const pct = Math.round((c.awarded / c.weight) * 100);
                return (
                  <div key={c.criterion} className="rounded-xl border border-line bg-bg/40 p-4">
                    <div className="flex items-baseline justify-between gap-3 pb-1.5">
                      <p className="text-xs font-medium text-ink">{c.criterion}</p>
                      <p className="tabular shrink-0 text-xs font-semibold text-ink">
                        {c.awarded}/{c.weight}
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-bg-overlay">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-danger"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="pt-2 text-xs leading-relaxed text-ink-muted">
                      {c.justification}
                    </p>
                    <p className="pt-1.5 text-xs leading-relaxed text-ink">
                      <span className="font-medium text-accent-bright">Fix: </span>
                      {c.fix}
                    </p>
                  </div>
                );
              })}
            </div>

            {result.strengths.length > 0 && (
              <div className="pt-4">
                <p className="pb-1.5 text-[11px] font-medium uppercase tracking-widest text-success">
                  What worked
                </p>
                <ul className="flex flex-col gap-1">
                  {result.strengths.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-xs text-ink-muted">
                      <CheckCircle size={13} weight="fill" className="mt-0.5 shrink-0 text-success" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4">
              <p className="pb-1.5 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
                Next steps
              </p>
              <ul className="flex flex-col gap-1">
                {result.nextSteps.map((s) => (
                  <li key={s} className="text-xs leading-relaxed text-ink-muted">
                    → {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3 pt-5">
              {!result.passed && (
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-xl bg-accent-soft px-5 py-2.5 text-sm font-medium text-accent-bright transition-transform duration-150 active:scale-[0.98]"
                >
                  Fix it and retry (attempt {result.attemptNo + 1})
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  openWithMessage(
                    `I just scored ${result.score}/100 on "${title}". The weakest criterion was "${
                      [...result.criteria].sort(
                        (a, b) => a.awarded / a.weight - b.awarded / b.weight
                      )[0]?.criterion
                    }". Can you walk me through how to think about that part properly?`
                  )
                }
                className="flex items-center gap-1.5 rounded-xl border border-line px-5 py-2.5 text-sm text-ink transition-colors duration-150 hover:border-accent/40"
              >
                <ChatCircleDots size={14} weight="duotone" />
                Review it with the Professor
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {previousAttempts.length > 0 && !result && (
        <section className="rounded-2xl border border-line bg-bg/40 p-5">
          <h2 className="pb-2 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
            Previous attempts
          </h2>
          <ul className="flex flex-col gap-1.5">
            {previousAttempts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-xs text-ink-muted"
              >
                <span>
                  Attempt {a.attemptNo} · {a.dateLabel}
                </span>
                {a.status === "graded" && a.score !== null ? (
                  <span
                    className={`tabular font-semibold ${
                      a.score >= passThreshold ? "text-success" : "text-warning"
                    }`}
                  >
                    {a.score}/100
                  </span>
                ) : (
                  <span className="text-ink-faint">{a.status}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
