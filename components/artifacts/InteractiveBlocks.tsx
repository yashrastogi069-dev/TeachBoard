"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CaretRight,
  ChatCircleDots,
  CheckCircle,
  Play,
  TreeStructure,
  XCircle,
} from "@phosphor-icons/react";
import Markdown from "@/components/artifacts/Markdown";
import { scoreCardSort, scoreQuiz, type LessonBlock } from "@/lib/blocks";

/*
  Interactive artifact blocks. Quiz and card-sort report a 0-100 score via
  onCheck (feeds lesson mastery); scenario opens the tutor via onDiscuss.
  Tree-map and terminal-sim are explorable but unscored. Card placement is
  tap-to-place (select a card, tap a bucket): works on touch, keyboard, and
  mouse without drag gymnastics.
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function QuizBlock({
  block,
  onCheck,
}: {
  block: Extract<LessonBlock, { type: "quiz" }>;
  onCheck: (score: number) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const correct = chosen !== null && chosen === block.correctIndex;

  function submit() {
    if (chosen === null || locked) return;
    setLocked(true);
    onCheck(scoreQuiz(block, chosen));
  }

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        Check yourself
      </p>
      <p className="pb-3 text-sm font-medium text-ink">{block.question}</p>
      <div className="flex flex-col gap-2">
        {block.options.map((option, i) => {
          const isChosen = chosen === i;
          const showState = locked && (isChosen || i === block.correctIndex);
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => setChosen(i)}
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors duration-150 ${
                showState && i === block.correctIndex
                  ? "border-success/50 bg-success/10 text-ink"
                  : showState && isChosen
                    ? "border-danger/50 bg-danger/10 text-ink"
                    : isChosen
                      ? "border-accent/60 bg-accent-soft text-ink"
                      : "border-line bg-bg-raised/50 text-ink-muted hover:border-line-strong"
              } ${locked ? "cursor-default" : "cursor-pointer active:scale-[0.99]"}`}
            >
              <span className="min-w-0">{option}</span>
              {showState && i === block.correctIndex && (
                <CheckCircle size={16} weight="fill" className="ml-auto shrink-0 text-success" />
              )}
              {showState && isChosen && i !== block.correctIndex && (
                <XCircle size={16} weight="fill" className="ml-auto shrink-0 text-danger" />
              )}
            </button>
          );
        })}
      </div>
      {!locked ? (
        <button
          type="button"
          onClick={submit}
          disabled={chosen === null}
          className="mt-3 rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Check answer
        </button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className={`mt-3 rounded-xl border p-3 text-xs leading-relaxed ${
              correct
                ? "border-success/30 bg-success/5 text-ink-muted"
                : "border-warning/30 bg-warning/5 text-ink-muted"
            }`}
          >
            <span className={`font-medium ${correct ? "text-success" : "text-warning"}`}>
              {correct ? "Correct. " : "Not quite. "}
            </span>
            {block.explanation}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export function CardSortBlock({
  block,
  onCheck,
}: {
  block: Extract<LessonBlock, { type: "card-sort" }>;
  onCheck: (score: number) => void;
}) {
  const shuffled = useMemo(
    () => [...block.cards].sort((a, b) => a.label.localeCompare(b.label)),
    [block.cards]
  );
  const [placement, setPlacement] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const unplaced = shuffled.filter((c) => !placement[c.id]);
  const allPlaced = unplaced.length === 0;

  function place(bucketId: string) {
    if (!selected || locked) return;
    setPlacement((p) => ({ ...p, [selected]: bucketId }));
    setSelected(null);
  }

  function check() {
    if (!allPlaced || locked) return;
    const s = scoreCardSort(block, placement);
    setScore(s);
    setLocked(true);
    onCheck(s);
  }

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        Sort the cards
      </p>
      <p className="pb-1 text-sm font-medium text-ink">{block.title}</p>
      <p className="pb-3 text-[11px] text-ink-faint">
        Tap a card, then tap the category it belongs to.
      </p>

      {unplaced.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-3">
          {unplaced.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelected(selected === card.id ? null : card.id)}
              className={`rounded-lg border px-3 py-2 text-xs transition-colors duration-150 active:scale-[0.97] ${
                selected === card.id
                  ? "border-accent/70 bg-accent-soft text-accent-bright"
                  : "border-line bg-bg-raised/60 text-ink hover:border-line-strong"
              }`}
            >
              {card.label}
            </button>
          ))}
        </div>
      )}

      <div className={`grid gap-2 ${block.buckets.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {block.buckets.map((bucket) => {
          const inBucket = shuffled.filter((c) => placement[c.id] === bucket.id);
          return (
            <button
              key={bucket.id}
              type="button"
              onClick={() => place(bucket.id)}
              disabled={locked || !selected}
              className={`flex min-h-24 flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors duration-150 ${
                selected && !locked
                  ? "border-accent/50 bg-accent-soft/30"
                  : "border-line bg-bg-raised/40"
              } ${!selected || locked ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                {bucket.label}
              </span>
              {inBucket.map((card) => {
                const wasCorrect = card.bucketId === bucket.id;
                return (
                  <span
                    key={card.id}
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${
                      locked
                        ? wasCorrect
                          ? "border-success/40 bg-success/10 text-ink"
                          : "border-danger/40 bg-danger/10 text-ink"
                        : "border-line bg-bg/60 text-ink"
                    }`}
                  >
                    {locked &&
                      (wasCorrect ? (
                        <CheckCircle size={12} weight="fill" className="shrink-0 text-success" />
                      ) : (
                        <XCircle size={12} weight="fill" className="shrink-0 text-danger" />
                      ))}
                    {card.label}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>

      {!locked ? (
        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={check}
            disabled={!allPlaced}
            className="rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check sorting
          </button>
          {!allPlaced && (
            <span className="text-[11px] text-ink-faint">
              {unplaced.length} card{unplaced.length === 1 ? "" : "s"} left to place
            </span>
          )}
          {Object.keys(placement).length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPlacement({});
                setSelected(null);
              }}
              className="text-[11px] text-ink-faint transition-colors hover:text-ink"
            >
              Reset
            </button>
          )}
        </div>
      ) : (
        <p className="pt-3 text-xs text-ink-muted">
          You placed{" "}
          <span className={`tabular font-semibold ${score !== null && score >= 70 ? "text-success" : "text-warning"}`}>
            {score}%
          </span>{" "}
          correctly. Wrong cards show where you put them; the border colors mark
          right and wrong.
        </p>
      )}
    </div>
  );
}

export function SliderSimBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: "slider-sim" }>;
}) {
  const [value, setValue] = useState<number>((block.min + block.max) / 2);
  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        Try it live
      </p>
      <p className="pb-1 text-sm font-medium text-ink">{block.title}</p>
      <p className="pb-4 text-xs text-ink-muted">{block.description}</p>

      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between text-xs text-ink-muted">
          {block.inputLabel}
          <span className="tabular font-semibold text-accent-bright">
            {value.toLocaleString()}
            {block.unit ? ` ${block.unit}` : ""}
          </span>
        </span>
        <input
          type="range"
          min={block.min}
          max={block.max}
          step={block.step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="accent-[var(--accent)]"
        />
      </label>

      <div className="grid gap-2 pt-4 sm:grid-cols-2">
        {block.outputs.map((out) => {
          const result = out.base + out.factor * value;
          return (
            <div
              key={out.label}
              className="rounded-xl border border-line bg-bg-raised/50 p-3 leading-tight"
            >
              <p className="text-[11px] text-ink-faint">{out.label}</p>
              <p className="tabular pt-1 font-display text-lg font-semibold text-ink">
                {Math.round(result * 100) / 100}
                {out.unit ? ` ${out.unit}` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TreeMapBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: "tree-map" }>;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <TreeStructure size={14} weight="duotone" className="text-accent" /> Concept map
      </p>
      <p className="pb-3 text-sm font-medium text-ink">{block.title}</p>

      <div className="mx-auto w-fit rounded-xl border border-accent/40 bg-accent-soft px-4 py-2 text-center text-xs font-semibold text-accent-bright">
        {block.root.label}
      </div>
      <div className="mx-auto h-3 w-px bg-line-strong" aria-hidden />

      <div className="flex flex-col gap-2">
        {block.root.children.map((branch, i) => {
          const isOpen = open === i;
          return (
            <div key={`${branch.label}-${i}`}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150 active:scale-[0.99] ${
                  isOpen
                    ? "border-accent/50 bg-accent-soft/40"
                    : "border-line bg-bg-raised/50 hover:border-line-strong"
                }`}
              >
                <CaretRight
                  size={12}
                  className={`shrink-0 text-accent transition-transform duration-150 ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
                <span className="min-w-0 text-xs font-medium text-ink">{branch.label}</span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 flex flex-col gap-2 border-l border-line py-2 pl-3">
                      <p className="text-xs leading-relaxed text-ink-muted">{branch.detail}</p>
                      {branch.children?.map((leaf, j) => (
                        <div
                          key={`${leaf.label}-${j}`}
                          className="rounded-lg border border-line bg-bg/60 p-2.5 leading-tight"
                        >
                          <p className="text-[11px] font-medium text-ink">{leaf.label}</p>
                          <p className="pt-0.5 text-[11px] leading-relaxed text-ink-faint">
                            {leaf.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <p className="pt-3 text-[11px] text-ink-faint">
        Tap a branch to unpack it. Every branch is one piece of the whole idea.
      </p>
    </div>
  );
}

export function TerminalSimBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: "terminal-sim" }>;
}) {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(0);
  const done = revealed >= block.steps.length;

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        Hands-on console
      </p>
      <p className="pb-1 text-sm font-medium text-ink">{block.title}</p>
      <p className="pb-3 text-xs text-ink-muted">{block.description}</p>

      <div className="overflow-hidden rounded-xl border border-line-strong bg-[color:var(--bg)]">
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
          <span className="size-2 rounded-full bg-danger/60" aria-hidden />
          <span className="size-2 rounded-full bg-warning/60" aria-hidden />
          <span className="size-2 rounded-full bg-success/60" aria-hidden />
          <span className="pl-2 font-mono text-[10px] text-ink-faint">praxis-lab</span>
        </div>
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto p-3">
          {block.steps.slice(0, revealed).map((step, i) => (
            <motion.div
              key={i}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="leading-relaxed"
            >
              <p className="font-mono text-[12px] text-ink">
                <span className="select-none text-accent-bright">$ </span>
                {step.command}
              </p>
              <pre className="whitespace-pre-wrap pt-1 font-mono text-[11px] text-ink-muted">
                {step.output}
              </pre>
              {step.note && (
                <p className="pt-1 text-[11px] italic text-accent-bright/80">{step.note}</p>
              )}
            </motion.div>
          ))}
          {revealed === 0 && (
            <p className="font-mono text-[11px] text-ink-faint">
              Press run to execute the first command.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-3">
        <button
          type="button"
          onClick={() => setRevealed((r) => Math.min(r + 1, block.steps.length))}
          disabled={done}
          className="flex items-center gap-1.5 rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={12} weight="fill" />
          {done ? "All steps run" : revealed === 0 ? "Run first command" : "Run next command"}
        </button>
        <span className="tabular text-[11px] text-ink-faint">
          {revealed}/{block.steps.length} steps
        </span>
        {revealed > 0 && (
          <button
            type="button"
            onClick={() => setRevealed(0)}
            className="text-[11px] text-ink-faint transition-colors hover:text-ink"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export function ScenarioBlock({
  block,
  onDiscuss,
}: {
  block: Extract<LessonBlock, { type: "scenario" }>;
  onDiscuss: (message: string) => void;
}) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="rounded-2xl border border-accent/25 bg-accent-soft/20 p-4">
      <p className="pb-2 text-[11px] font-medium uppercase tracking-widest text-accent-bright">
        Real-world scenario
      </p>
      <Markdown text={block.prompt} />
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() =>
            onDiscuss(
              `About this scenario from the lesson: "${block.prompt.slice(0, 300)}" ... here is my thinking: `
            )
          }
          className="flex items-center gap-1.5 rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97]"
        >
          <ChatCircleDots size={14} weight="duotone" />
          Discuss with the Professor
        </button>
        <button
          type="button"
          onClick={() => setShowHint((v) => !v)}
          className="text-[11px] text-ink-faint transition-colors hover:text-ink"
        >
          {showHint ? "Hide hint" : "I am stuck, show a hint"}
        </button>
      </div>
      <AnimatePresence>
        {showHint && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="overflow-hidden pt-3 text-xs text-ink-muted"
          >
            {block.hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
