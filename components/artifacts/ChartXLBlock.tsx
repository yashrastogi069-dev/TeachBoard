"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowClockwise,
  ArrowRight,
  CaretLeft,
  ChartBar,
  CheckCircle,
  Eye,
  Lightbulb,
  XCircle,
} from "@phosphor-icons/react";
import Markdown from "@/components/artifacts/Markdown";
import {
  scoreChartXlProbe,
  type ChartXlBlock as ChartXlBlockT,
  type ChartXlProbeOutcome,
} from "@/lib/blocks";

/*
  ChartXLBlock renders a chart-xl artifact: an ECharts chart (loaded client-
  only via next/dynamic so it never blocks SSR/first paint) plus its always-
  visible caption and up to two playable layers. `story` is a progressive
  walkthrough whose steps optionally focus a series/node/category that the
  canvas highlights via dispatchAction. `probe` is a scored question; scoring
  uses scoreChartXlProbe (100 first-try / 60 retry / 20 revealed) and reports
  through onCheck exactly like the other scored blocks. A story-only chart is
  not scored (LessonPlayer only counts chart-xl toward interactives when a
  probe is present).
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

const ChartXLCanvas = dynamic(() => import("@/components/artifacts/ChartXLCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[340px] w-full items-center justify-center rounded-xl border border-line bg-bg-inset/50">
      <div className="flex flex-col items-center gap-2">
        <ChartBar size={28} weight="duotone" className="animate-pulse text-accent opacity-60" />
        <span className="text-[11px] text-ink-faint">Rendering chart...</span>
      </div>
    </div>
  ),
});

function scoreTone(score: number): string {
  return score >= 70 ? "text-success" : "text-warning";
}

export default function ChartXLBlock({
  block,
  onCheck,
}: {
  block: ChartXlBlockT;
  onCheck: (score: number) => void;
}) {
  const reduce = useReducedMotion();

  // Story walkthrough state.
  const [step, setStep] = useState(0);
  const hasStory = !!block.story && block.story.steps.length > 0;
  const steps = block.story?.steps ?? [];
  const focus = hasStory ? steps[step]?.focus ?? null : null;

  // Probe state.
  const probe = block.probe;
  const [picked, setPicked] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const correctId = useMemo(
    () => probe?.options.find((o) => o.correct)?.id ?? null,
    [probe]
  );

  function settle(outcome: ChartXlProbeOutcome) {
    const s = scoreChartXlProbe(outcome);
    setScore(s);
    setLocked(true);
    onCheck(s);
  }

  function submit() {
    if (!probe || locked || picked === null) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (picked === correctId) {
      settle(nextAttempts === 1 ? "correct-first-try" : "correct-retry");
    }
    // wrong answer on first attempt: stays open for one retry, handled by UI
  }

  function reveal() {
    if (!probe || locked) return;
    setRevealed(true);
    settle("revealed");
  }

  function resetProbe() {
    setPicked(null);
    setAttempts(0);
    setLocked(false);
    setRevealed(false);
    setScore(null);
  }

  const wrongFirstTry = attempts === 1 && !locked && picked !== correctId;

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <ChartBar size={14} weight="duotone" className="text-accent" /> Chart
      </p>
      <p className="pb-3 text-sm font-medium text-ink">{block.title}</p>

      <div className="rounded-xl border border-line bg-bg-inset/40 p-2">
        <ChartXLCanvas block={block} animate={!reduce} focus={focus} />
      </div>

      <p className="pt-2.5 text-xs leading-relaxed text-ink-muted">{block.caption}</p>

      {hasStory && (
        <div className="mt-3 rounded-xl border border-line bg-bg-raised/40 p-3">
          <div className="flex items-center gap-2 pb-1.5">
            <Lightbulb size={14} weight="duotone" className="text-accent" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-ink-faint">
              Walkthrough
            </span>
            <span className="tabular ml-auto text-[11px] text-ink-faint">
              {step + 1} / {steps.length}
            </span>
          </div>
          <motion.p
            key={step}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="min-h-[2.5rem] text-sm leading-relaxed text-ink-muted"
          >
            {steps[step]?.text}
          </motion.p>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-ink transition-colors duration-150 hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CaretLeft size={12} weight="bold" />
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              disabled={step >= steps.length - 1}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent-soft px-3.5 py-1.5 text-[11px] font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ArrowRight size={12} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {probe && (
        <div className="mt-3 rounded-xl border border-line bg-bg-raised/40 p-3">
          <p className="pb-2.5 text-sm font-medium text-ink">{probe.question}</p>
          <div className="flex flex-col gap-2">
            {probe.options.map((opt) => {
              const isPicked = picked === opt.id;
              const showCorrect = (locked || revealed) && opt.correct;
              const showWrongPick = locked && isPicked && !opt.correct;

              let className =
                "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-150 ";
              if (showCorrect) {
                className += "border-success/60 bg-success/12 text-ink";
              } else if (showWrongPick) {
                className += "border-danger/60 bg-danger/12 text-ink";
              } else if (isPicked) {
                className += "border-accent/60 bg-accent-soft/25 text-ink";
              } else {
                className +=
                  "border-line text-ink-muted hover:border-line-strong/60 hover:bg-bg-overlay/40";
              }
              if (locked) className += " cursor-default";
              else className += " cursor-pointer active:scale-[0.99]";

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => !locked && setPicked(opt.id)}
                  disabled={locked}
                  aria-pressed={isPicked}
                  className={className}
                >
                  <span className="flex-1">{opt.label}</span>
                  {showCorrect && <CheckCircle size={16} weight="fill" className="text-success" />}
                  {showWrongPick && <XCircle size={16} weight="fill" className="text-danger" />}
                </button>
              );
            })}
          </div>

          {wrongFirstTry && (
            <p className="pt-2 text-[11px] text-warning">
              Not quite. Take another look at the chart and try once more.
            </p>
          )}

          {locked ? (
            <div className="mt-3">
              <div className="rounded-lg border border-line bg-bg-inset/40 p-3">
                <p className="pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
                  Explanation
                </p>
                <Markdown text={probe.explain} />
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <p className="text-xs text-ink-muted">
                  You scored{" "}
                  <span className={`tabular font-semibold ${scoreTone(score ?? 0)}`}>{score}%</span>
                  {revealed ? " (revealed)" : attempts > 1 ? " (retry)" : " (first try)"}.
                </p>
                <button
                  type="button"
                  onClick={resetProbe}
                  className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[11px] font-medium text-ink transition-colors duration-150 hover:border-accent/40"
                >
                  <ArrowClockwise size={13} weight="bold" />
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                type="button"
                onClick={submit}
                disabled={picked === null}
                className="rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {attempts === 0 ? "Submit answer" : "Submit retry"}
              </button>
              <button
                type="button"
                onClick={reveal}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[11px] font-medium text-ink-muted transition-colors duration-150 hover:border-accent/40"
              >
                <Eye size={13} weight="bold" />
                Reveal answer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
