"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowClockwise,
  ArrowRight,
  Briefcase,
  ChatCircleDots,
  CheckCircle,
  CircleNotch,
  Flag,
  ListChecks,
  Medal,
  NotePencil,
  Play,
  SealCheck,
  Target,
  TrendDown,
  TrendUp,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import Markdown from "@/components/artifacts/Markdown";
import {
  scoreSimulation,
  simulateMetrics,
  type LessonBlock,
  type SimulationPath,
} from "@/lib/blocks";
import { useMission, type MissionDecision } from "@/components/lesson/MissionContext";

/*
  The Mission Engine: a concept turned into a playable job. Four blocks share
  one run through MissionContext:
    MissionBriefing  -> drops the learner into a role (the hook)
    SimulationPlayer -> branching decisions with visible metric consequences
    ReflectionPrompt -> the learner names what they learned
    ExpertReview     -> an AI persona critiques the actual decision path
  All scoring and metric replay reuse the deterministic helpers in lib/blocks
  so the chart, the score, and the saved run always agree.
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

type MissionBlockT = Extract<LessonBlock, { type: "mission" }>;
type SimulationBlockT = Extract<LessonBlock, { type: "simulation" }>;
type ReflectionBlockT = Extract<LessonBlock, { type: "reflection" }>;
type ExpertReviewBlockT = Extract<LessonBlock, { type: "expert-review" }>;

type Metric = SimulationBlockT["metrics"][number];

/* ---------- MissionBriefing ---------- */

/*
  Cinematic framing card. This is the only mission block allowed accent glow
  (DESIGN.md glow budget): it is the hook that sets the scene, so it earns the
  emphasis. Records the mission framing into context for the expert review.
*/
export function MissionBriefing({ block }: { block: MissionBlockT }) {
  const reduce = useReducedMotion();
  const mission = useMission();
  const setMissionMeta = mission?.setMissionMeta;

  useEffect(() => {
    setMissionMeta?.({
      title: block.title,
      role: block.role,
      objective: block.objective,
      stakes: block.stakes,
    });
  }, [setMissionMeta, block.title, block.role, block.objective, block.stakes]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="accent-wash glow-accent-strong relative overflow-hidden rounded-2xl border border-accent/40 bg-bg-raised/80 p-6"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-accent-soft/50 blur-2xl"
        aria-hidden
      />
      <div className="relative">
        <p className="flex items-center gap-2 pb-3 text-[11px] font-medium uppercase tracking-widest text-accent-bright">
          <Briefcase size={14} weight="duotone" /> Your mission
        </p>
        <h3 className="font-display text-2xl font-semibold text-ink text-balance">{block.title}</h3>
        <p className="pt-2 text-base font-medium text-accent-bright">{block.role}</p>

        <div className="pt-4">
          <Markdown text={block.briefing} />
        </div>

        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <div className="rounded-xl border border-accent/20 bg-bg/50 p-4 leading-tight">
            <p className="flex items-center gap-1.5 pb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
              <Target size={14} weight="duotone" className="text-accent" /> Objective
            </p>
            <p className="text-sm leading-relaxed text-ink">{block.objective}</p>
          </div>
          <div className="rounded-xl border border-warning/25 bg-warning-soft/40 p-4 leading-tight">
            <p className="flex items-center gap-1.5 pb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
              <Warning size={14} weight="duotone" className="text-warning" /> Stakes
            </p>
            <p className="text-sm leading-relaxed text-ink">{block.stakes}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-4">
          {block.constraints.map((c, i) => (
            <motion.span
              key={`${c.label}-${i}`}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: EASE, delay: reduce ? 0 : 0.16 + 0.04 * i }}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-bg/60 px-2.5 py-1.5 text-xs text-ink-muted"
            >
              <span className="font-medium uppercase tracking-wider text-ink-faint">
                {c.label}
              </span>
              <span className="tabular font-medium text-ink">{c.value}</span>
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- SimulationPlayer helpers ---------- */

function metricGoalMet(metric: Metric, value: number): boolean {
  if (metric.goal === undefined) return false;
  return metric.higherIsBetter ? value >= metric.goal : value <= metric.goal;
}

/*
  A change is "good" when it moves a metric toward being better, honoring each
  metric's higherIsBetter flag. Drives the delta badge color and arrow.
*/
function deltaIsGood(metric: Metric, delta: number): boolean {
  if (delta === 0) return true;
  return metric.higherIsBetter ? delta > 0 : delta < 0;
}

type Outcome = "success" | "partial" | "failed";

/*
  Deterministic verdict. When metrics carry goals, the outcome is how many of
  those goals the final values meet (all -> success, some -> partial, none ->
  failed). When no metric has a goal, fall back to the quality-average score so
  the verdict is still meaningful and reproducible.
*/
function deriveOutcome(
  metrics: Metric[],
  finals: Record<string, number>,
  score: number
): Outcome {
  const withGoals = metrics.filter((m) => m.goal !== undefined);
  if (withGoals.length === 0) {
    if (score >= 70) return "success";
    if (score >= 40) return "partial";
    return "failed";
  }
  const met = withGoals.filter((m) => metricGoalMet(m, finals[m.id] ?? m.start)).length;
  if (met === withGoals.length) return "success";
  if (met > 0) return "partial";
  return "failed";
}

const OUTCOME_COPY: Record<Outcome, { label: string; tone: string; border: string; fill: string }> = {
  success: {
    label: "Mission succeeded",
    tone: "text-success",
    border: "border-success/40",
    fill: "bg-success/10",
  },
  partial: {
    label: "Partial success",
    tone: "text-warning",
    border: "border-warning/40",
    fill: "bg-warning/10",
  },
  failed: {
    label: "Mission failed",
    tone: "text-danger",
    border: "border-danger/40",
    fill: "bg-danger/10",
  },
};

/*
  Lightweight trajectory chart for one metric across the learner's own
  decisions. Same no-dependency approach as the chart block, drawn as an SVG
  polyline scaled to the metric's own range (including its goal) so each metric
  reads on its own scale. A dashed goal line appears when metric.goal is set.
*/
function MetricTrajectory({
  metric,
  values,
}: {
  metric: Metric;
  values: number[];
}) {
  const reduce = useReducedMotion();
  const W = 300;
  const H = 60;
  const padX = 6;
  const padY = 8;

  const pool = metric.goal !== undefined ? [...values, metric.goal] : values;
  const lo = Math.min(...pool);
  const hi = Math.max(...pool);
  const span = hi - lo || 1;

  const x = (i: number) =>
    values.length <= 1 ? W / 2 : padX + (i / (values.length - 1)) * (W - padX * 2);
  const y = (v: number) => padY + (1 - (v - lo) / span) * (H - padY * 2);

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const goalY = metric.goal !== undefined ? y(metric.goal) : null;

  const start = values[0];
  const final = values[values.length - 1];
  const delta = final - start;
  const met = metricGoalMet(metric, final);
  const good = deltaIsGood(metric, delta);

  return (
    <div className="rounded-xl border border-line bg-bg/50 p-3">
      <div className="flex items-baseline justify-between gap-2 pb-2">
        <span className="min-w-0 truncate text-xs font-medium text-ink">{metric.label}</span>
        <span className="flex shrink-0 items-baseline gap-1.5">
          <span className="tabular text-sm font-semibold text-ink">
            {final.toLocaleString()}
            {metric.unit ? ` ${metric.unit}` : ""}
          </span>
          {delta !== 0 && (
            <span
              className={`tabular text-[11px] font-medium ${good ? "text-success" : "text-danger"}`}
            >
              {delta > 0 ? "+" : ""}
              {delta.toLocaleString()}
            </span>
          )}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-14 w-full"
        role="img"
        aria-label={`${metric.label} moved from ${start} to ${final}`}
      >
        {goalY !== null && (
          <line
            x1={padX}
            x2={W - padX}
            y1={goalY}
            y2={goalY}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="4 4"
            className="text-ink-faint"
          />
        )}
        <motion.polyline
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
        />
        {values.map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={2.5}
            fill="currentColor"
            className="text-accent-bright"
          />
        ))}
      </svg>
      <p className="pt-1.5 text-[11px] text-ink-faint">
        {metric.goal !== undefined ? (
          <>
            Goal {metric.goal.toLocaleString()}
            {metric.unit ? ` ${metric.unit}` : ""} ·{" "}
            <span className={met ? "text-success" : "text-warning"}>
              {met ? "met" : "not met"}
            </span>
          </>
        ) : (
          <>Start {start.toLocaleString()}</>
        )}
      </p>
    </div>
  );
}

/* ---------- SimulationPlayer ---------- */

type Phase = "playing" | "debrief";

export function SimulationPlayer({
  block,
  onCheck,
  lessonId,
  blockIndex,
}: {
  block: SimulationBlockT;
  onCheck: (score: number) => void;
  lessonId?: string;
  blockIndex?: number;
}) {
  const reduce = useReducedMotion();
  const mission = useMission();

  const stageById = useMemo(
    () => new Map(block.stages.map((s) => [s.id, s])),
    [block.stages]
  );

  const [stageId, setStageId] = useState<string>(block.stages[0].id);
  const [decisions, setDecisions] = useState<MissionDecision[]>([]);
  const [pickedChoiceId, setPickedChoiceId] = useState<string | null>(null);
  const [lastEffects, setLastEffects] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>("playing");
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const path: SimulationPath = useMemo(
    () => decisions.map((d) => ({ stageId: d.stageId, choiceId: d.choiceId })),
    [decisions]
  );
  const { trajectory, finals } = useMemo(
    () => simulateMetrics(block, path),
    [block, path]
  );
  const current = trajectory[trajectory.length - 1] ?? {};

  // Mirror the run into MissionContext as decisions happen, so the reflection
  // and expert-review blocks see the live path, metrics, and done state.
  const recordSimulation = mission?.recordSimulation;
  useEffect(() => {
    recordSimulation?.({
      path: decisions,
      trajectory,
      finals,
      simulationDone: phase === "debrief",
    });
  }, [recordSimulation, decisions, trajectory, finals, phase]);

  const stage = stageById.get(stageId);
  const pickedChoice = stage?.choices.find((c) => c.id === pickedChoiceId) ?? null;

  function pick(choiceId: string) {
    if (!stage || pickedChoiceId) return;
    const choice = stage.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    setPickedChoiceId(choiceId);
    setLastEffects(
      choice.effects.reduce<Record<string, number>>((acc, e) => {
        acc[e.metricId] = (acc[e.metricId] ?? 0) + e.delta;
        return acc;
      }, {})
    );
    setDecisions((prev) => [
      ...prev,
      {
        stageId: stage.id,
        choiceId: choice.id,
        quality: choice.quality,
        situation: stage.situation,
        chosenLabel: choice.label,
        feedback: choice.feedback,
      },
    ]);
  }

  function advance() {
    if (!stage || !pickedChoice) return;
    const targetId = pickedChoice.goTo;
    let nextStageId: string | null = null;
    if (targetId && stageById.has(targetId)) {
      nextStageId = targetId;
    } else {
      const idx = block.stages.findIndex((s) => s.id === stage.id);
      const next = block.stages[idx + 1];
      nextStageId = next ? next.id : null;
    }

    if (nextStageId) {
      setStageId(nextStageId);
      setPickedChoiceId(null);
      setLastEffects({});
    } else {
      finish();
    }
  }

  function finish() {
    setPhase("debrief");
    const finalPath: SimulationPath = decisions.map((d) => ({
      stageId: d.stageId,
      choiceId: d.choiceId,
    }));
    const { trajectory: finalTrajectory, finals: finalFinals } = simulateMetrics(
      block,
      finalPath
    );
    const score = scoreSimulation(block, finalPath);
    const outcome = deriveOutcome(block.metrics, finalFinals, score);
    onCheck(score);
    void saveRun(finalTrajectory, finalFinals, outcome, score);
  }

  async function saveRun(
    finalTrajectory: Array<Record<string, number>>,
    finalFinals: Record<string, number>,
    outcome: Outcome,
    score: number
  ) {
    if (!lessonId || blockIndex === undefined || decisions.length === 0) return;
    try {
      const res = await fetch("/api/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          lessonId,
          blockIndex,
          path: decisions.map((d) => ({
            stageId: d.stageId,
            choiceId: d.choiceId,
            quality: d.quality,
          })),
          metrics: { trajectory: finalTrajectory, finals: finalFinals },
          reflection: mission?.reflection || undefined,
          outcome,
          variant: 0,
          mastery: score,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? `Save failed with status ${res.status}`);
      }
      if (data?.runId) mission?.setMissionRunId(data.runId as string);
      setSaveNote(null);
    } catch (err) {
      // Rule: a save failure must never break the run. Keep playing; note quietly.
      setSaveNote(err instanceof Error ? err.message : "This run could not be saved.");
    }
  }

  function replay() {
    setStageId(block.stages[0].id);
    setDecisions([]);
    setPickedChoiceId(null);
    setLastEffects({});
    setPhase("playing");
    setSaveNote(null);
    mission?.resetSimulation();
  }

  const stageNumber = decisions.length + (pickedChoiceId ? 0 : 1);
  const score = scoreSimulation(block, path);
  const outcome = deriveOutcome(block.metrics, finals, score);
  const outcomeStyle = OUTCOME_COPY[outcome];

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <div className="flex items-baseline justify-between gap-3 pb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-widest text-ink-faint">
            Simulation
          </p>
          <p className="pt-0.5 text-sm font-medium text-ink">{block.title}</p>
        </div>
        {phase === "playing" && (
          <span className="tabular shrink-0 whitespace-nowrap text-[11px] text-ink-faint">
            Stage {Math.min(stageNumber, block.stages.length)}/{block.stages.length}
          </span>
        )}
      </div>

      {/* Live metric readout */}
      <div className="grid gap-2 pb-4 sm:grid-cols-2">
        {block.metrics.map((metric) => {
          const value = current[metric.id] ?? metric.start;
          const change = lastEffects[metric.id];
          return (
            <div
              key={metric.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg-raised/50 px-3 py-2 leading-tight"
            >
              <span className="min-w-0 truncate text-[11px] text-ink-muted">{metric.label}</span>
              <span className="flex shrink-0 items-baseline gap-1.5">
                <span className="tabular font-display text-sm font-semibold text-ink">
                  {value.toLocaleString()}
                  {metric.unit ? ` ${metric.unit}` : ""}
                </span>
                <AnimatePresence>
                  {change !== undefined && change !== 0 && (
                    <motion.span
                      key={`${stageId}-${change}`}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className={`tabular inline-flex items-center gap-0.5 rounded-md px-1 text-[10px] font-medium ${
                        deltaIsGood(metric, change)
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {deltaIsGood(metric, change) ? (
                        <TrendUp size={10} weight="bold" />
                      ) : (
                        <TrendDown size={10} weight="bold" />
                      )}
                      {change > 0 ? "+" : ""}
                      {change.toLocaleString()}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </div>
          );
        })}
      </div>

      {phase === "playing" && stage && (
        <motion.div
          key={stageId}
          initial={reduce ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.26, ease: EASE }}
        >
          <Markdown text={stage.situation} />
          <div className="flex flex-col gap-2 pt-2">
            {stage.choices.map((choice) => {
              const isPicked = pickedChoiceId === choice.id;
              const dimmed = pickedChoiceId !== null && !isPicked;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => pick(choice.id)}
                  disabled={pickedChoiceId !== null}
                  className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition-all duration-150 ${
                    isPicked
                      ? "border-accent/60 bg-accent-soft text-ink glow-accent"
                      : dimmed
                        ? "cursor-default border-line bg-bg-raised/30 text-ink-faint"
                        : "cursor-pointer border-line bg-bg-raised/50 text-ink-muted hover:border-accent/40 hover:bg-bg-raised/80 active:scale-[0.99]"
                  }`}
                >
                  <span className="min-w-0">{choice.label}</span>
                  {isPicked && (
                    <CheckCircle
                      size={18}
                      weight="fill"
                      className="ml-auto shrink-0 text-accent-bright"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {pickedChoice && (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="mt-3 rounded-xl border border-accent/30 bg-accent-soft/20 p-4"
              >
                <p className="pb-1.5 text-[11px] font-medium uppercase tracking-wider text-accent-bright">
                  What happens
                </p>
                <p className="text-sm leading-relaxed text-ink-muted">{pickedChoice.feedback}</p>
                <button
                  type="button"
                  onClick={advance}
                  className="glow-hover mt-3 flex items-center gap-1.5 rounded-lg bg-accent-soft px-4 py-2 text-sm font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97]"
                >
                  {pickedChoice.goTo ||
                  block.stages.findIndex((s) => s.id === stage.id) < block.stages.length - 1
                    ? "Continue"
                    : "See debrief"}
                  <ArrowRight size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {phase === "debrief" && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: EASE }}
          className="flex flex-col gap-4"
        >
          <div className={`rounded-xl border ${outcomeStyle.border} ${outcomeStyle.fill} p-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`flex items-center gap-2 text-sm font-semibold ${outcomeStyle.tone}`}>
                <Flag size={16} weight="duotone" />
                {outcomeStyle.label}
              </p>
              <span className="tabular text-xs text-ink-muted">
                Decision quality{" "}
                <span className={`font-semibold ${score >= 70 ? "text-success" : "text-warning"}`}>
                  {score}%
                </span>
              </span>
            </div>
            <div className="pt-3">
              <Markdown text={block.debrief} />
            </div>
          </div>

          <div>
            <p className="pb-2 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
              Consequence trajectory
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {block.metrics.map((metric) => (
                <MetricTrajectory
                  key={metric.id}
                  metric={metric}
                  values={trajectory.map((t) => t[metric.id] ?? metric.start)}
                />
              ))}
            </div>
          </div>

          {saveNote && (
            <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-[11px] leading-relaxed text-warning">
              Your progress here still counts, but this run was not saved to your history:{" "}
              {saveNote}
            </p>
          )}

          <div>
            <button
              type="button"
              onClick={replay}
              className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink transition-colors duration-150 hover:border-accent/40"
            >
              <ArrowClockwise size={13} weight="bold" />
              Replay and try a different path
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ---------- ReflectionPrompt ---------- */

const REFLECTION_MIN_WORDS = 30;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function ReflectionPrompt({
  block,
  onCheck,
  onDiscuss,
}: {
  block: ReflectionBlockT;
  onCheck: (score: number) => void;
  onDiscuss: (message: string) => void;
}) {
  const reduce = useReducedMotion();
  const mission = useMission();
  const [text, setText] = useState(mission?.reflection ?? "");
  const [saved, setSaved] = useState(false);

  const words = countWords(text);
  const enough = words >= REFLECTION_MIN_WORDS;

  function save() {
    if (!enough || saved) return;
    mission?.setReflection(text.trim());
    setSaved(true);
    onCheck(100);
  }

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <NotePencil size={14} weight="duotone" className="text-accent" /> Reflect on the mission
      </p>
      <p className="pb-2 text-sm font-medium text-ink">{block.prompt}</p>
      <p className="pb-3 text-xs leading-relaxed text-ink-muted">{block.guidance}</p>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={5}
        placeholder="Write what you would do differently and why it matters..."
        className="w-full resize-y rounded-xl border border-line bg-bg-raised/50 p-3 text-xs leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:border-accent/50"
      />

      <div className="flex flex-wrap items-center gap-3 pt-3">
        <button
          type="button"
          onClick={save}
          disabled={!enough || saved}
          className="rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saved ? "Reflection saved" : "Save reflection"}
        </button>
        <button
          type="button"
          onClick={() =>
            onDiscuss(
              `I am reflecting on this mission. The prompt was: "${block.prompt}" Here is my thinking so far: ${
                text.trim() || "(I am not sure where to start)"
              }`
            )
          }
          className="flex items-center gap-1.5 text-[11px] text-ink-faint transition-colors hover:text-ink"
        >
          <ChatCircleDots size={13} weight="duotone" />
          Discuss with the Professor
        </button>
        <span className="tabular ml-auto text-[11px] text-ink-faint">
          {saved ? (
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle size={12} weight="fill" /> Logged
            </span>
          ) : (
            <>
              {words}/{REFLECTION_MIN_WORDS} words
            </>
          )}
        </span>
      </div>

      <AnimatePresence>
        {enough && !saved && (
          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="overflow-hidden pt-2 text-[11px] text-accent-bright"
          >
            Looks thorough. Save it to log this reflection.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- ExpertReview ---------- */

type ReviewVerdict = "strong" | "acceptable" | "weak";

type ReviewResult = {
  score: number;
  summary: string;
  perDecision: Array<{ verdict: ReviewVerdict; critique: string }>;
};

const VERDICT_STYLE: Record<ReviewVerdict, { label: string; tone: string; border: string; fill: string }> = {
  strong: {
    label: "Strong",
    tone: "text-success",
    border: "border-success/40",
    fill: "bg-success/10",
  },
  acceptable: {
    label: "Acceptable",
    tone: "text-warning",
    border: "border-warning/40",
    fill: "bg-warning/10",
  },
  weak: {
    label: "Weak",
    tone: "text-danger",
    border: "border-danger/40",
    fill: "bg-danger/10",
  },
};

export function ExpertReview({
  block,
  onCheck,
  lessonId,
  blockIndex,
}: {
  block: ExpertReviewBlockT;
  onCheck: (score: number) => void;
  lessonId?: string;
  blockIndex?: number;
}) {
  const reduce = useReducedMotion();
  const mission = useMission();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const reportedRef = useRef(false);

  const ready = mission?.simulationDone ?? false;
  const decisions = mission?.path ?? [];
  const missionTitle = mission?.missionMeta?.title ?? block.title;

  async function requestReview() {
    if (loading || !ready) return;
    if (!lessonId || blockIndex === undefined) {
      setError("This review needs a saved lesson context to run.");
      return;
    }
    if (decisions.length === 0) {
      setError("Play the simulation first so there are decisions to review.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          lessonId,
          blockIndex,
          runId: mission?.missionRunId ?? undefined,
          persona: block.persona,
          rubric: block.rubric,
          missionTitle,
          decisions: decisions.map((d) => ({
            situation: d.situation,
            chosenLabel: d.chosenLabel,
            quality: d.quality,
            feedback: d.feedback,
          })),
          reflection: mission?.reflection || undefined,
          finals: mission?.finals ?? {},
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? `Review failed with status ${res.status}`);
      }
      const reviewed: ReviewResult = {
        score: data.score,
        summary: data.summary,
        perDecision: data.perDecision,
      };
      setResult(reviewed);
      if (!reportedRef.current) {
        reportedRef.current = true;
        onCheck(Math.round(reviewed.score));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Expert review failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <SealCheck size={14} weight="duotone" className="text-accent" /> Expert review
      </p>
      <p className="pb-1 text-sm font-medium text-ink">{block.title}</p>
      <p className="pb-3 text-xs text-ink-muted">
        Reviewed by <span className="text-ink">{block.persona}</span>
      </p>

      <div className="flex flex-wrap gap-1.5 pb-3">
        {block.rubric.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-bg-raised/50 px-2.5 py-1 text-[11px] text-ink-muted"
          >
            <ListChecks size={12} weight="duotone" className="text-accent" />
            {item}
          </span>
        ))}
      </div>

      {!result && (
        <>
          {!ready && (
            <p className="rounded-xl border border-line bg-bg-raised/40 p-3 text-[11px] leading-relaxed text-ink-faint">
              Finish the simulation above to unlock the expert review. The reviewer critiques the
              exact decisions you made.
            </p>
          )}
          {error && (
            <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-[11px] leading-relaxed text-danger">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={requestReview}
            disabled={!ready || loading}
            className="mt-3 flex items-center gap-2 rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <CircleNotch size={14} weight="bold" className="animate-spin" />
                The reviewer is reading your decisions...
              </>
            ) : (
              <>
                <Medal size={14} weight="duotone" />
                {error ? "Try the review again" : "Request expert review"}
              </>
            )}
          </button>
        </>
      )}

      {result && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: EASE }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-3">
            {result.perDecision.map((review, i) => {
              const decision = decisions[i];
              const style = VERDICT_STYLE[review.verdict] ?? VERDICT_STYLE.acceptable;
              return (
                <motion.div
                  key={i}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: EASE, delay: reduce ? 0 : 0.04 * i }}
                  className="rounded-xl border border-line bg-bg-raised/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2 pb-1.5">
                    <span className="min-w-0 text-[11px] text-ink-faint">
                      Decision {i + 1}
                      {decision ? (
                        <span className="text-ink-muted">
                          {" "}
                          · you chose{" "}
                          <span className="text-ink">&ldquo;{decision.chosenLabel}&rdquo;</span>
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-md border ${style.border} ${style.fill} px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style.tone}`}
                    >
                      {review.verdict === "weak" ? (
                        <XCircle size={11} weight="fill" />
                      ) : (
                        <CheckCircle size={11} weight="fill" />
                      )}
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-ink-muted">{review.critique}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE, delay: reduce ? 0 : 0.04 * result.perDecision.length + 0.05 }}
            className="accent-wash glow-accent relative overflow-hidden rounded-xl border border-accent/40 bg-accent-soft/25 p-4"
          >
            <div className="relative flex flex-wrap items-baseline justify-between gap-2 pb-2">
              <p className="flex items-center gap-2 text-base font-semibold text-ink">
                <Medal size={18} weight="duotone" className="text-accent" /> Overall verdict
              </p>
              <motion.span
                initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.4,
                  ease: EASE,
                  delay: reduce ? 0 : 0.04 * result.perDecision.length + 0.12,
                }}
                className="tabular font-display text-3xl font-semibold text-accent-bright"
              >
                {Math.round(result.score)}
                <span className="text-base text-ink-faint">/100</span>
              </motion.span>
            </div>
            <p className="relative text-sm leading-relaxed text-ink-muted">{result.summary}</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
