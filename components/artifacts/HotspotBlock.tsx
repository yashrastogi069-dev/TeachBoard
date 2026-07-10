"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowClockwise,
  CheckCircle,
  MagnifyingGlass,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import Markdown from "@/components/artifacts/Markdown";
import { scoreHotspot, type HotspotAnswer, type HotspotBlock as HotspotBlockT } from "@/lib/blocks";

/*
  hotspot: "find the N problems" on a rendered scene, imageless (percentage-
  positioned regions over a plain scene box) so the AI can author it as pure
  text. Regions are invisible hit-targets before checking, matching the
  "judge by reading context, not by seeing outlines" design in the task brief.
  Tapping toggles selection (accessible <button>, aria-pressed), mirroring the
  tap-to-select pattern already used by CardMatchBlock's "assemble" mode.
  Checking calls scoreHotspot and reveals every region's true state; retry
  resets cleanly.
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

type Status = "true-positive" | "false-positive" | "missed" | "correct-reject";

function statusOf(selected: boolean, isIssue: boolean): Status {
  if (isIssue) return selected ? "true-positive" : "missed";
  return selected ? "false-positive" : "correct-reject";
}

const STATUS_META: Record<
  Status,
  { label: string; boxClass: string; textClass: string }
> = {
  "true-positive": {
    label: "Found it",
    boxClass: "border-success/60 bg-success/15",
    textClass: "text-success",
  },
  "false-positive": {
    label: "False alarm",
    boxClass: "border-danger/60 bg-danger/15",
    textClass: "text-danger",
  },
  missed: {
    label: "Missed",
    boxClass: "border-warning/60 bg-warning/15",
    textClass: "text-warning",
  },
  "correct-reject": {
    label: "Correctly left alone",
    boxClass: "border-line bg-bg-raised/30",
    textClass: "text-ink-faint",
  },
};

function scoreTone(score: number): string {
  return score >= 70 ? "text-success" : "text-warning";
}

export default function HotspotBlock({
  block,
  onCheck,
}: {
  block: HotspotBlockT;
  onCheck: (score: number) => void;
}) {
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const issueCount = useMemo(
    () => block.regions.filter((r) => r.isIssue).length,
    [block.regions]
  );

  function toggle(id: string) {
    if (locked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function check() {
    if (locked || selected.size === 0) return;
    const answer: HotspotAnswer = Array.from(selected);
    const s = scoreHotspot(block, answer);
    setScore(s);
    setLocked(true);
    onCheck(s);
  }

  function reset() {
    setSelected(new Set());
    setLocked(false);
    setScore(null);
  }

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <MagnifyingGlass size={14} weight="duotone" className="text-accent" /> Find the issues
      </p>
      <p className="pb-3 text-sm font-medium text-ink">{block.title}</p>

      <div className="pb-3">
        <Markdown text={block.scenarioMarkdown} />
      </div>

      <p className="pb-2 text-[11px] text-ink-faint">
        {locked
          ? "Every region is revealed below. Green = you caught it, red = a false alarm, amber = you missed it."
          : `Tap the areas you believe are a problem. There ${
              issueCount === 1 ? "is" : "are"
            } ${issueCount} real issue${issueCount === 1 ? "" : "s"} to find in this scene.`}
      </p>

      <div
        className="relative w-full overflow-hidden rounded-xl border border-line-strong bg-bg-inset/60"
        style={{ height: 320 }}
      >
        {block.regions.map((region) => {
          const isSelected = selected.has(region.id);
          const status = locked ? statusOf(isSelected, region.isIssue) : null;
          const meta = status ? STATUS_META[status] : null;

          let className =
            "absolute rounded-lg border transition-colors duration-150 text-left";
          if (locked && meta) {
            className += ` ${meta.boxClass} cursor-default`;
          } else if (isSelected) {
            className += " border-accent/60 bg-accent-soft/25 cursor-pointer active:scale-[0.98]";
          } else {
            className +=
              " border-transparent bg-transparent hover:border-line-strong/50 hover:bg-bg-raised/20 cursor-pointer active:scale-[0.98]";
          }

          return (
            <motion.button
              key={region.id}
              type="button"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: EASE }}
              onClick={() => toggle(region.id)}
              disabled={locked}
              aria-pressed={isSelected}
              aria-label={region.label}
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
              }}
              className={className}
            >
              {locked && meta && (
                <span
                  className={`absolute -top-2.5 left-1.5 flex items-center gap-1 rounded-md border bg-bg px-1.5 py-0.5 text-[10px] font-medium ${meta.boxClass} ${meta.textClass}`}
                >
                  {status === "true-positive" && <CheckCircle size={11} weight="fill" />}
                  {status === "false-positive" && <XCircle size={11} weight="fill" />}
                  {status === "missed" && <WarningCircle size={11} weight="fill" />}
                  {meta.label}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {locked ? (
        <div className="flex flex-wrap items-center gap-3 pt-3">
          <p className="text-xs text-ink-muted">
            You scored <span className={`tabular font-semibold ${scoreTone(score ?? 0)}`}>{score}%</span>.
          </p>
          <button
            type="button"
            onClick={reset}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[11px] font-medium text-ink transition-colors duration-150 hover:border-accent/40"
          >
            <ArrowClockwise size={13} weight="bold" />
            Try again
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 pt-3">
          <button
            type="button"
            onClick={check}
            disabled={selected.size === 0}
            className="rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check for issues
          </button>
          {selected.size === 0 && (
            <span className="text-[11px] text-ink-faint">Tap at least one area first</span>
          )}
          {selected.size > 0 && (
            <span className="tabular text-[11px] text-ink-faint">
              {selected.size} area{selected.size === 1 ? "" : "s"} selected
            </span>
          )}
        </div>
      )}

      {locked && (
        <div className="mt-3 flex flex-col gap-2">
          {block.regions.map((region) => {
            const isSelected = selected.has(region.id);
            const status = statusOf(isSelected, region.isIssue);
            const meta = STATUS_META[status];
            return (
              <div
                key={region.id}
                className={`rounded-xl border p-3 ${meta.boxClass}`}
              >
                <p className={`flex items-center gap-1.5 pb-1 text-[11px] font-medium ${meta.textClass}`}>
                  {status === "true-positive" && <CheckCircle size={12} weight="fill" />}
                  {status === "false-positive" && <XCircle size={12} weight="fill" />}
                  {status === "missed" && <WarningCircle size={12} weight="fill" />}
                  {region.label} &middot; {meta.label}
                </p>
                <p className="text-xs leading-relaxed text-ink-muted">{region.explanation}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
