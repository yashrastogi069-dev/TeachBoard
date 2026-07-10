"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowClockwise,
  CheckCircle,
  LinkSimple,
  ListNumbers,
  PuzzlePiece,
  XCircle,
} from "@phosphor-icons/react";
import {
  scoreCardMatch,
  type CardMatchAssembleAnswer,
  type CardMatchMatchPairsAnswer,
  type CardMatchSequenceAnswer,
  type LessonBlock,
} from "@/lib/blocks";

/*
  card-match interactive block. One tap-to-place mechanic across three modes
  (match-pairs, sequence, assemble), mirroring the accessibility decision in
  CardSortBlock: every action is a real <button>, nothing depends on pointer
  drag. Each mode builds the answer shape scoreCardMatch expects, calls
  onCheck(score), then color-codes per-item correctness. Retry resets cleanly.
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

type CardMatchBlockT = Extract<LessonBlock, { type: "card-match" }>;

function scoreTone(score: number): string {
  return score >= 70 ? "text-success" : "text-warning";
}

export default function CardMatchBlock({
  block,
  onCheck,
}: {
  block: CardMatchBlockT;
  onCheck: (score: number) => void;
}) {
  if (block.mode === "match-pairs") {
    return <MatchPairs block={block} onCheck={onCheck} />;
  }
  if (block.mode === "sequence") {
    return <Sequence block={block} onCheck={onCheck} />;
  }
  return <Assemble block={block} onCheck={onCheck} />;
}

/* ---------- shell shared by all three modes ---------- */

function Shell({
  eyebrow,
  icon,
  title,
  instruction,
  children,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  instruction: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        {icon}
        {eyebrow}
      </p>
      <p className="pb-1 text-sm font-medium text-ink">{title}</p>
      <p className="pb-3 text-[11px] text-ink-faint">{instruction}</p>
      {children}
    </div>
  );
}

function CheckBar({
  ready,
  locked,
  score,
  readyHint,
  lockedMessage,
  onCheck,
  onReset,
  canReset,
  checkLabel,
}: {
  ready: boolean;
  locked: boolean;
  score: number | null;
  readyHint: string | null;
  lockedMessage: React.ReactNode;
  onCheck: () => void;
  onReset: () => void;
  canReset: boolean;
  checkLabel: string;
}) {
  if (locked) {
    return (
      <div className="flex flex-wrap items-center gap-3 pt-3">
        <p className="text-xs text-ink-muted">
          You scored{" "}
          <span className={`tabular font-semibold ${scoreTone(score ?? 0)}`}>{score}%</span>.{" "}
          {lockedMessage}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[11px] font-medium text-ink transition-colors duration-150 hover:border-accent/40"
        >
          <ArrowClockwise size={13} weight="bold" />
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 pt-3">
      <button
        type="button"
        onClick={onCheck}
        disabled={!ready}
        className="rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {checkLabel}
      </button>
      {!ready && readyHint && <span className="text-[11px] text-ink-faint">{readyHint}</span>}
      {canReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-ink-faint transition-colors hover:text-ink"
        >
          Reset
        </button>
      )}
    </div>
  );
}

/* ---------- match-pairs ---------- */

function MatchPairs({
  block,
  onCheck,
}: {
  block: CardMatchBlockT;
  onCheck: (score: number) => void;
}) {
  const reduce = useReducedMotion();
  const pairs = useMemo(() => block.pairs ?? [], [block.pairs]);
  // Left column keeps authored order; right column is shuffled so the answer
  // is not simply "line them up in place".
  const rights = useMemo(
    () => [...pairs].sort((a, b) => a.right.localeCompare(b.right)),
    [pairs]
  );

  const [pairing, setPairing] = useState<Record<string, string>>({}); // leftId -> rightId
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const rightToLeft = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(pairing).forEach(([l, r]) => map.set(r, l));
    return map;
  }, [pairing]);

  // Stable link numbers so a matched left card and its right card share a badge.
  const linkNumber = useMemo(() => {
    const left = new Map<string, number>();
    const right = new Map<string, number>();
    Object.entries(pairing).forEach(([l, r], i) => {
      left.set(l, i + 1);
      right.set(r, i + 1);
    });
    return { left, right };
  }, [pairing]);

  const allMatched = Object.keys(pairing).length === pairs.length && pairs.length > 0;

  function connect(leftId: string, rightId: string) {
    setPairing((prev) => {
      const next: Record<string, string> = {};
      // drop any existing use of either endpoint before adding the new link
      Object.entries(prev).forEach(([l, r]) => {
        if (l === leftId || r === rightId) return;
        next[l] = r;
      });
      next[leftId] = rightId;
      return next;
    });
    setSelectedLeft(null);
    setSelectedRight(null);
  }

  function tapLeft(id: string) {
    if (locked) return;
    if (pairing[id]) {
      setPairing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSelectedLeft(null);
      return;
    }
    if (selectedLeft === id) {
      setSelectedLeft(null);
      return;
    }
    if (selectedRight) {
      connect(id, selectedRight);
      return;
    }
    setSelectedLeft(id);
  }

  function tapRight(id: string) {
    if (locked) return;
    const owner = rightToLeft.get(id);
    if (owner) {
      setPairing((prev) => {
        const next = { ...prev };
        delete next[owner];
        return next;
      });
      setSelectedRight(null);
      return;
    }
    if (selectedRight === id) {
      setSelectedRight(null);
      return;
    }
    if (selectedLeft) {
      connect(selectedLeft, id);
      return;
    }
    setSelectedRight(id);
  }

  function check() {
    if (!allMatched || locked) return;
    const answer: CardMatchMatchPairsAnswer = pairing;
    const s = scoreCardMatch(block, answer);
    setScore(s);
    setLocked(true);
    onCheck(s);
  }

  function reset() {
    setPairing({});
    setSelectedLeft(null);
    setSelectedRight(null);
    setLocked(false);
    setScore(null);
  }

  return (
    <Shell
      eyebrow="Match the pairs"
      icon={<LinkSimple size={14} weight="duotone" className="text-accent" />}
      title={block.title}
      instruction="Tap a card on the left, then its match on the right. Tap a linked card to break the link."
    >
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2">
        <p className="pb-1 text-[11px] font-medium uppercase tracking-wider text-ink-muted">Term</p>
        <span aria-hidden />
        <p className="pb-1 text-[11px] font-medium uppercase tracking-wider text-ink-muted">Match</p>

        {pairs.map((pair, i) => {
          const right = rights[i];
          const leftMatched = Boolean(pairing[pair.id]);
          const leftNum = linkNumber.left.get(pair.id);
          const leftCorrect = locked ? pairing[pair.id] === pair.id : false;

          const rightOwner = rightToLeft.get(right.id);
          const rightMatched = Boolean(rightOwner);
          const rightNum = linkNumber.right.get(right.id);
          const rightCorrect = locked ? rightOwner === right.id : false;

          return (
            <div key={pair.id} className="contents">
              <motion.button
                type="button"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: EASE, delay: reduce ? 0 : i * 0.04 }}
                onClick={() => tapLeft(pair.id)}
                disabled={locked}
                aria-pressed={selectedLeft === pair.id || leftMatched}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors duration-150 ${
                  locked
                    ? leftCorrect
                      ? "border-success/50 bg-success/10 text-ink"
                      : "border-danger/50 bg-danger/10 text-ink"
                    : selectedLeft === pair.id
                      ? "border-accent/70 bg-accent-soft text-accent-bright"
                      : leftMatched
                        ? "border-accent/40 bg-accent-soft/40 text-ink"
                        : "border-line bg-bg-raised/60 text-ink hover:border-line-strong"
                } ${locked ? "cursor-default" : "cursor-pointer active:scale-[0.98]"}`}
              >
                {locked ? (
                  leftCorrect ? (
                    <CheckCircle size={15} weight="fill" className="shrink-0 text-success" />
                  ) : (
                    <XCircle size={15} weight="fill" className="shrink-0 text-danger" />
                  )
                ) : (
                  leftNum !== undefined && (
                    <span className="tabular flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-[color:var(--bg)]">
                      {leftNum}
                    </span>
                  )
                )}
                <span className="min-w-0">{pair.left}</span>
              </motion.button>

              <span className="flex items-center justify-center text-ink-faint" aria-hidden>
                <LinkSimple size={13} weight={leftMatched ? "bold" : "regular"} />
              </span>

              <motion.button
                type="button"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: EASE, delay: reduce ? 0 : i * 0.04 + 0.02 }}
                onClick={() => tapRight(right.id)}
                disabled={locked}
                aria-pressed={selectedRight === right.id || rightMatched}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors duration-150 ${
                  locked
                    ? rightCorrect
                      ? "border-success/50 bg-success/10 text-ink"
                      : "border-danger/50 bg-danger/10 text-ink"
                    : selectedRight === right.id
                      ? "border-accent/70 bg-accent-soft text-accent-bright"
                      : rightMatched
                        ? "border-accent/40 bg-accent-soft/40 text-ink"
                        : "border-line bg-bg-raised/60 text-ink hover:border-line-strong"
                } ${locked ? "cursor-default" : "cursor-pointer active:scale-[0.98]"}`}
              >
                {locked ? (
                  rightCorrect ? (
                    <CheckCircle size={15} weight="fill" className="shrink-0 text-success" />
                  ) : (
                    <XCircle size={15} weight="fill" className="shrink-0 text-danger" />
                  )
                ) : (
                  rightNum !== undefined && (
                    <span className="tabular flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-[color:var(--bg)]">
                      {rightNum}
                    </span>
                  )
                )}
                <span className="min-w-0">{right.right}</span>
              </motion.button>
            </div>
          );
        })}
      </div>

      <CheckBar
        ready={allMatched}
        locked={locked}
        score={score}
        readyHint={
          allMatched
            ? null
            : `${pairs.length - Object.keys(pairing).length} pair${
                pairs.length - Object.keys(pairing).length === 1 ? "" : "s"
              } left to link`
        }
        lockedMessage="Green links are correct; red links need rethinking."
        onCheck={check}
        onReset={reset}
        canReset={Object.keys(pairing).length > 0}
        checkLabel="Check answers"
      />
    </Shell>
  );
}

/* ---------- sequence ---------- */

function Sequence({
  block,
  onCheck,
}: {
  block: CardMatchBlockT;
  onCheck: (score: number) => void;
}) {
  const reduce = useReducedMotion();
  const steps = useMemo(() => block.steps ?? [], [block.steps]);
  // Present the steps shuffled so the correct order is not the given order.
  const shuffled = useMemo(
    () => [...steps].sort((a, b) => a.label.localeCompare(b.label)),
    [steps]
  );

  const [order, setOrder] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const allPlaced = order.length === steps.length && steps.length > 0;

  function tap(id: string) {
    if (locked) return;
    setOrder((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function check() {
    if (!allPlaced || locked) return;
    const answer: CardMatchSequenceAnswer = order;
    const s = scoreCardMatch(block, answer);
    setScore(s);
    setLocked(true);
    onCheck(s);
  }

  function reset() {
    setOrder([]);
    setLocked(false);
    setScore(null);
  }

  const stepById = useMemo(() => new Map(steps.map((s) => [s.id, s])), [steps]);

  return (
    <Shell
      eyebrow="Put it in order"
      icon={<ListNumbers size={14} weight="duotone" className="text-accent" />}
      title={block.title}
      instruction="Tap the steps in the order you believe is correct. Tap a numbered step again to pull it back out."
    >
      <div className="flex flex-col gap-2">
        {shuffled.map((step, i) => {
          const pos = order.indexOf(step.id);
          const placed = pos !== -1;
          const isCorrect = locked && step.correctPosition === pos;
          return (
            <motion.button
              key={step.id}
              type="button"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: EASE, delay: reduce ? 0 : i * 0.04 }}
              onClick={() => tap(step.id)}
              disabled={locked}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors duration-150 ${
                locked
                  ? isCorrect
                    ? "border-success/50 bg-success/10 text-ink"
                    : "border-danger/50 bg-danger/10 text-ink"
                  : placed
                    ? "border-accent/60 bg-accent-soft text-ink"
                    : "border-line bg-bg-raised/60 text-ink hover:border-line-strong"
              } ${locked ? "cursor-default" : "cursor-pointer active:scale-[0.98]"}`}
            >
              <span
                className={`tabular flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  placed
                    ? "bg-accent text-[color:var(--bg)]"
                    : "border border-line-strong text-ink-faint"
                }`}
              >
                {placed ? pos + 1 : ""}
              </span>
              <span className="min-w-0">{step.label}</span>
              {locked &&
                (isCorrect ? (
                  <CheckCircle size={15} weight="fill" className="ml-auto shrink-0 text-success" />
                ) : (
                  <span className="ml-auto shrink-0 text-[10px] font-medium text-danger">
                    goes at #{step.correctPosition + 1}
                  </span>
                ))}
            </motion.button>
          );
        })}
      </div>

      {order.length > 0 && !locked && (
        <p className="pt-3 text-[11px] text-ink-faint">
          Your order:{" "}
          <span className="text-ink-muted">
            {order.map((id) => stepById.get(id)?.label ?? id).join(" -> ")}
          </span>
        </p>
      )}

      <CheckBar
        ready={allPlaced}
        locked={locked}
        score={score}
        readyHint={
          allPlaced
            ? null
            : `${steps.length - order.length} step${
                steps.length - order.length === 1 ? "" : "s"
              } left to place`
        }
        lockedMessage="Steps in a green row sit in the right slot; red rows show where each one belongs."
        onCheck={check}
        onReset={reset}
        canReset={order.length > 0}
        checkLabel="Check order"
      />
    </Shell>
  );
}

/* ---------- assemble ---------- */

function Assemble({
  block,
  onCheck,
}: {
  block: CardMatchBlockT;
  onCheck: (score: number) => void;
}) {
  const reduce = useReducedMotion();
  const pieces = useMemo(() => block.pieces ?? [], [block.pieces]);
  const shuffled = useMemo(
    () => [...pieces].sort((a, b) => a.label.localeCompare(b.label)),
    [pieces]
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState<number | null>(null);

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
    const answer: CardMatchAssembleAnswer = Array.from(selected);
    const s = scoreCardMatch(block, answer);
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
    <Shell
      eyebrow="Assemble the answer"
      icon={<PuzzlePiece size={14} weight="duotone" className="text-accent" />}
      title={block.title}
      instruction="Tap every piece that belongs, and leave out the ones that do not."
    >
      <div className="rounded-xl border border-accent/25 bg-accent-soft/20 px-3 py-2 text-xs font-medium text-accent-bright">
        Build: {block.targetLabel}
      </div>

      <div className="flex flex-wrap gap-2 pt-3">
        {shuffled.map((piece, i) => {
          const isSelected = selected.has(piece.id);
          let stateClass =
            "border-line bg-bg-raised/60 text-ink hover:border-line-strong";
          if (locked) {
            if (isSelected && piece.correct)
              stateClass = "border-success/50 bg-success/10 text-ink";
            else if (isSelected && !piece.correct)
              stateClass = "border-danger/50 bg-danger/10 text-ink";
            else if (!isSelected && piece.correct)
              stateClass = "border-warning/50 bg-warning/10 text-ink";
            else stateClass = "border-line bg-bg-raised/30 text-ink-faint";
          } else if (isSelected) {
            stateClass = "border-accent/70 bg-accent-soft text-accent-bright";
          }
          return (
            <motion.button
              key={piece.id}
              type="button"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: EASE, delay: reduce ? 0 : i * 0.04 }}
              onClick={() => toggle(piece.id)}
              disabled={locked}
              aria-pressed={isSelected}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors duration-150 ${stateClass} ${
                locked ? "cursor-default" : "cursor-pointer active:scale-[0.97]"
              }`}
            >
              {locked && isSelected && piece.correct && (
                <CheckCircle size={14} weight="fill" className="shrink-0 text-success" />
              )}
              {locked && isSelected && !piece.correct && (
                <XCircle size={14} weight="fill" className="shrink-0 text-danger" />
              )}
              {locked && !isSelected && piece.correct && (
                <span className="shrink-0 text-[10px] font-medium text-warning">missed</span>
              )}
              <span className="min-w-0">{piece.label}</span>
            </motion.button>
          );
        })}
      </div>

      <CheckBar
        ready={selected.size > 0}
        locked={locked}
        score={score}
        readyHint={selected.size > 0 ? null : "Select at least one piece"}
        lockedMessage="Green pieces belong and you found them; red are distractors you grabbed; amber are ones you missed."
        onCheck={check}
        onReset={reset}
        canReset={selected.size > 0}
        checkLabel="Check assembly"
      />
    </Shell>
  );
}
