"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowClockwise,
  ArrowsOutCardinal,
  CheckCircle,
  CircleNotch,
  LinkSimple,
  Medal,
  NoteBlank,
  Plus,
  SealCheck,
  Trash,
  X,
} from "@phosphor-icons/react";
import { type LessonBlock } from "@/lib/blocks";

/*
  whiteboard interactive block. A freeform canvas where the learner arranges
  sticky notes (percentage-positioned so the board scales to any width) and
  draws connections between them to build a mental model, then asks an AI
  persona to critique the ACTUAL board against the block rubric via the
  /api/mission "whiteboard-review" action.

  Accessibility mirrors card-sort's tap-to-place principle applied to free
  positioning: a note is selected by tap, then MOVED with the arrow keys (no
  pointer drag required). Pointer drag is layered on as a progressive
  enhancement only. Connections are made by tap-select-first, tap-select-second
  in an explicit "connect" mode, never by dragging a wire.
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];
const NUDGE = 4; // percent per arrow key press
const CANVAS_MIN_X = 4;
const CANVAS_MAX_X = 96;
const CANVAS_MIN_Y = 6;
const CANVAS_MAX_Y = 94;

type WhiteboardBlockT = Extract<LessonBlock, { type: "whiteboard" }>;

type Note = { id: string; text: string; x: number; y: number };
type Connection = { fromId: string; toId: string };
type Feedback = { targetId: string; comment: string };
type Critique = { score: number; summary: string; feedback: Feedback[] };

type Mode = "select" | "connect";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function connectionKey(c: Connection): string {
  return [c.fromId, c.toId].sort().join("::");
}

export default function WhiteboardBlock({
  block,
  onCheck,
  lessonId,
  blockIndex,
}: {
  block: WhiteboardBlockT;
  onCheck: (score: number) => void;
  lessonId?: string;
  blockIndex?: number;
}) {
  const reduce = useReducedMotion();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);
  const nextIdRef = useRef(1);
  const reportedRef = useRef(false);

  const [notes, setNotes] = useState<Note[]>(() =>
    (block.seedNotes ?? []).map((n) => ({ id: n.id, text: n.text, x: n.x, y: n.y }))
  );
  const [connections, setConnections] = useState<Connection[]>([]);
  const [mode, setMode] = useState<Mode>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [draftText, setDraftText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [critique, setCritique] = useState<Critique | null>(null);

  const noteById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);
  const canReview = notes.length >= 2 && connections.length >= 1;

  /* ---------- note placement ---------- */

  function nextPosition(): { x: number; y: number } {
    // Fan new notes out from the middle-left so they do not stack on one spot.
    const count = notes.length;
    const x = clamp(18 + (count % 4) * 20, CANVAS_MIN_X, CANVAS_MAX_X);
    const y = clamp(20 + Math.floor(count / 4) * 22, CANVAS_MIN_Y, CANVAS_MAX_Y);
    return { x, y };
  }

  function addNote() {
    const text = draftText.trim();
    if (!text) return;
    const id = `learner-${nextIdRef.current++}`;
    const { x, y } = nextPosition();
    setNotes((prev) => [...prev, { id, text, x, y }]);
    setDraftText("");
    setAdding(false);
    setSelectedId(id);
    setMode("select");
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
    if (selectedId === id) setSelectedId(null);
    if (connectFrom === id) setConnectFrom(null);
  }

  function moveNote(id: string, dx: number, dy: number) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              x: clamp(n.x + dx, CANVAS_MIN_X, CANVAS_MAX_X),
              y: clamp(n.y + dy, CANVAS_MIN_Y, CANVAS_MAX_Y),
            }
          : n
      )
    );
  }

  /* ---------- selection / connection ---------- */

  function tapNote(id: string) {
    if (mode === "connect") {
      if (connectFrom === null) {
        setConnectFrom(id);
        return;
      }
      if (connectFrom === id) {
        setConnectFrom(null);
        return;
      }
      const candidate: Connection = { fromId: connectFrom, toId: id };
      setConnections((prev) => {
        const exists = prev.some((c) => connectionKey(c) === connectionKey(candidate));
        return exists ? prev : [...prev, candidate];
      });
      setConnectFrom(null);
      return;
    }
    setSelectedId((cur) => (cur === id ? null : id));
  }

  function onNoteKeyDown(e: React.KeyboardEvent, id: string) {
    if (mode !== "select") return;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        moveNote(id, 0, -NUDGE);
        break;
      case "ArrowDown":
        e.preventDefault();
        moveNote(id, 0, NUDGE);
        break;
      case "ArrowLeft":
        e.preventDefault();
        moveNote(id, -NUDGE, 0);
        break;
      case "ArrowRight":
        e.preventDefault();
        moveNote(id, NUDGE, 0);
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        deleteNote(id);
        break;
      default:
        break;
    }
  }

  function removeConnection(c: Connection) {
    setConnections((prev) => prev.filter((x) => connectionKey(x) !== connectionKey(c)));
  }

  function toggleMode() {
    setMode((m) => (m === "connect" ? "select" : "connect"));
    setConnectFrom(null);
    setSelectedId(null);
  }

  /* ---------- pointer drag (progressive enhancement over tap+arrows) ---------- */

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    const board = boardRef.current;
    if (!drag || !board) return;
    const rect = board.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, CANVAS_MIN_X, CANVAS_MAX_X);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, CANVAS_MIN_Y, CANVAS_MAX_Y);
    drag.moved = true;
    setNotes((prev) => prev.map((n) => (n.id === drag.id ? { ...n, x, y } : n)));
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onPointerMove]);

  function onNotePointerDown(e: React.PointerEvent, id: string) {
    if (mode !== "select") return;
    // Left button / touch only; let keyboard and tap paths keep working.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    dragRef.current = { id, moved: false };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  }

  /* ---------- AI critique ---------- */

  async function requestCritique() {
    if (loading || !canReview) return;
    if (!lessonId || blockIndex === undefined) {
      setError("This critique needs a saved lesson context to run.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "whiteboard-review",
          lessonId,
          blockIndex,
          persona: block.persona,
          rubric: block.rubric,
          prompt: block.prompt,
          notes: notes.map((n) => ({ id: n.id, text: n.text, x: Math.round(n.x), y: Math.round(n.y) })),
          connections: connections.map((c) => ({ fromId: c.fromId, toId: c.toId })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? `Critique failed with status ${res.status}`);
      }
      const result: Critique = {
        score: data.score,
        summary: data.summary,
        feedback: data.feedback,
      };
      setCritique(result);
      if (!reportedRef.current) {
        reportedRef.current = true;
        onCheck(Math.round(result.score));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Whiteboard critique failed");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- feedback target labels ---------- */

  function feedbackLabel(targetId: string): string {
    const note = noteById.get(targetId);
    if (note) return note.text;
    // Connection references arrive as "fromId->toId" or "fromId::toId".
    const parts = targetId.split(/->|::/).map((p) => p.trim());
    if (parts.length === 2) {
      const from = noteById.get(parts[0]);
      const to = noteById.get(parts[1]);
      if (from && to) return `${from.text} -> ${to.text}`;
    }
    return targetId;
  }

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <NoteBlank size={14} weight="duotone" className="text-accent" /> Model it on the board
      </p>
      <p className="pb-1 text-sm font-medium text-ink">{block.title}</p>
      <p className="pb-3 text-xs leading-relaxed text-ink-muted">{block.prompt}</p>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setMode("select");
          }}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-bg-raised/60 px-3 py-1.5 text-[11px] font-medium text-ink transition-colors duration-150 hover:border-accent/40 active:scale-[0.97]"
        >
          <Plus size={13} weight="bold" /> Add note
        </button>
        <button
          type="button"
          onClick={toggleMode}
          aria-pressed={mode === "connect"}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors duration-150 active:scale-[0.97] ${
            mode === "connect"
              ? "border-accent/60 bg-accent-soft text-accent-bright"
              : "border-line bg-bg-raised/60 text-ink hover:border-accent/40"
          }`}
        >
          <LinkSimple size={13} weight="bold" />
          {mode === "connect" ? "Connecting..." : "Connect notes"}
        </button>
        {selectedId && mode === "select" && (
          <button
            type="button"
            onClick={() => deleteNote(selectedId)}
            className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-[11px] font-medium text-danger transition-colors duration-150 hover:border-danger/60 active:scale-[0.97]"
          >
            <Trash size={13} weight="bold" /> Delete note
          </button>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-ink-faint">
          <ArrowsOutCardinal size={12} weight="bold" />
          {mode === "connect"
            ? connectFrom
              ? "Tap the note to link it to"
              : "Tap the first note to connect"
            : "Tap a note, then use arrow keys to move it"}
        </span>
      </div>

      {adding && (
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <input
            type="text"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNote();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setDraftText("");
              }
            }}
            autoFocus
            maxLength={120}
            placeholder="Short note text..."
            className="min-w-0 flex-1 rounded-lg border border-line bg-bg-raised/60 px-3 py-2 text-xs text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:border-accent/50"
          />
          <button
            type="button"
            onClick={addNote}
            disabled={!draftText.trim()}
            className="rounded-lg bg-accent-soft px-3 py-2 text-[11px] font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Place note
          </button>
        </div>
      )}

      {/* canvas */}
      <div
        ref={boardRef}
        className="relative w-full overflow-hidden rounded-xl border border-line-strong bg-bg-inset"
        style={{ height: 340 }}
      >
        {/* subtle dotted grid backdrop */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--border) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden
        />

        {/* connections layer */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <marker
              id="wb-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
            </marker>
          </defs>
          {connections.map((c) => {
            const from = noteById.get(c.fromId);
            const to = noteById.get(c.toId);
            if (!from || !to) return null;
            return (
              <line
                key={connectionKey(c)}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--accent)"
                strokeWidth={0.5}
                strokeLinecap="round"
                markerEnd="url(#wb-arrow)"
                opacity={0.7}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {notes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="text-[11px] text-ink-faint">
              The board is empty. Add a note to start mapping your thinking.
            </p>
          </div>
        )}

        {notes.map((note) => {
          const isSelected = selectedId === note.id;
          const isConnectFrom = connectFrom === note.id;
          return (
            <motion.button
              key={note.id}
              type="button"
              initial={reduce ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: EASE }}
              onClick={() => tapNote(note.id)}
              onPointerDown={(e) => onNotePointerDown(e, note.id)}
              onKeyDown={(e) => onNoteKeyDown(e, note.id)}
              aria-pressed={isSelected || isConnectFrom}
              aria-label={`Note: ${note.text}`}
              className={`absolute max-w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] leading-snug shadow-sm transition-colors duration-150 ${
                isConnectFrom
                  ? "border-accent/70 bg-accent-soft text-accent-bright"
                  : isSelected
                    ? "border-accent/60 bg-accent-soft/70 text-ink"
                    : "border-line-strong bg-bg-raised text-ink hover:border-accent/40"
              } ${mode === "connect" ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
              style={{
                left: `${note.x}%`,
                top: `${note.y}%`,
                touchAction: "none",
              }}
            >
              {note.text}
            </motion.button>
          );
        })}
      </div>

      {/* connection list (keyboard-reachable removal) */}
      {connections.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3">
          {connections.map((c) => {
            const from = noteById.get(c.fromId);
            const to = noteById.get(c.toId);
            if (!from || !to) return null;
            return (
              <span
                key={connectionKey(c)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg-raised/50 py-1 pl-2.5 pr-1 text-[11px] text-ink-muted"
              >
                <LinkSimple size={11} weight="bold" className="shrink-0 text-accent" />
                <span className="min-w-0 truncate">
                  {from.text} -&gt; {to.text}
                </span>
                <button
                  type="button"
                  onClick={() => removeConnection(c)}
                  aria-label={`Remove connection from ${from.text} to ${to.text}`}
                  className="shrink-0 rounded p-0.5 text-ink-faint transition-colors hover:text-danger"
                >
                  <X size={11} weight="bold" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* rubric + critique */}
      <div className="mt-4 rounded-xl border border-line bg-bg-raised/40 p-3">
        <p className="flex items-center gap-2 pb-2 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
          <SealCheck size={13} weight="duotone" className="text-accent" /> Expert critique
        </p>
        <p className="pb-2 text-[11px] text-ink-muted">
          Reviewed by <span className="text-ink">{block.persona}</span>
        </p>
        <div className="flex flex-wrap gap-1.5 pb-3">
          {block.rubric.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex shrink-0 items-center rounded-lg border border-line bg-bg/50 px-2.5 py-1 text-[11px] text-ink-muted"
            >
              {item}
            </span>
          ))}
        </div>

        {!critique && (
          <>
            {!canReview && (
              <p className="rounded-xl border border-line bg-bg/40 p-3 text-[11px] leading-relaxed text-ink-faint">
                Add at least two notes and draw at least one connection between them, then request a
                critique of your actual board.
              </p>
            )}
            {error && (
              <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-[11px] leading-relaxed text-danger">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={requestCritique}
              disabled={!canReview || loading}
              className="mt-3 flex items-center gap-2 rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <CircleNotch size={14} weight="bold" className="animate-spin" />
                  The reviewer is reading your board...
                </>
              ) : (
                <>
                  <Medal size={14} weight="duotone" />
                  {error ? "Try the critique again" : "Request AI critique"}
                </>
              )}
            </button>
          </>
        )}

        {critique && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-2">
              {critique.feedback.map((fb, i) => (
                <motion.div
                  key={i}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: EASE, delay: reduce ? 0 : 0.04 * i }}
                  className="rounded-xl border border-line bg-bg/50 p-3"
                >
                  <p className="flex items-center gap-1.5 pb-1 text-[11px] font-medium text-accent-bright">
                    <NoteBlank size={12} weight="duotone" className="shrink-0" />
                    <span className="min-w-0 truncate">{feedbackLabel(fb.targetId)}</span>
                  </p>
                  <p className="text-xs leading-relaxed text-ink-muted">{fb.comment}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                ease: EASE,
                delay: reduce ? 0 : 0.04 * critique.feedback.length + 0.05,
              }}
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
                    delay: reduce ? 0 : 0.04 * critique.feedback.length + 0.12,
                  }}
                  className="tabular font-display text-3xl font-semibold text-accent-bright"
                >
                  {Math.round(critique.score)}
                  <span className="text-base text-ink-faint">/100</span>
                </motion.span>
              </div>
              <p className="relative text-sm leading-relaxed text-ink-muted">{critique.summary}</p>
            </motion.div>

            <button
              type="button"
              onClick={() => {
                setCritique(null);
                setError(null);
              }}
              className="flex items-center gap-1.5 self-start rounded-lg border border-line px-3 py-1.5 text-[11px] font-medium text-ink transition-colors duration-150 hover:border-accent/40"
            >
              <ArrowClockwise size={13} weight="bold" />
              Revise the board and critique again
            </button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {critique && (
          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="flex items-center gap-1.5 pt-2 text-[11px] text-success"
          >
            <CheckCircle size={12} weight="fill" /> Critique logged to this lesson.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
