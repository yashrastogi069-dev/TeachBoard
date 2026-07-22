"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Article,
  CheckCircle,
  ChartBar,
  ClockCounterClockwise,
  Columns,
  Crosshair,
  Cube,
  Eyeglasses,
  FlowArrow,
  Graph,
  type Icon,
  ImageSquare,
  Lightbulb,
  NotePencil,
  Path,
  PencilLine,
  PencilSimpleLine,
  Question,
  Sliders,
  Sparkle,
  SquaresFour,
  Stack,
  Table,
  Target,
  Terminal,
  TreeStructure,
  VideoCamera,
  Cards,
} from "@phosphor-icons/react";
import type { LessonContent } from "@/lib/blocks";
import ArtifactRenderer from "@/components/artifacts/ArtifactRenderer";
import { MissionProvider } from "@/components/lesson/MissionContext";
import { useTutor } from "@/components/shell/TutorContext";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

/*
  Per-block "signpost" header shown above each artifact so the lesson reads as
  a sequence of distinct stations, not one long gray column. Color is by block
  FAMILY (content = neutral, interactive = accent, scored/test = warning); the
  icon and label name the block type. No left-border stripe (banned pattern).
*/
type BlockFamily = "content" | "interactive" | "test";

const FAMILY_TONE: Record<BlockFamily, string> = {
  content: "text-ink-muted",
  interactive: "text-accent",
  test: "text-warning",
};

const BLOCK_META: Record<string, { icon: Icon; label: string; family: BlockFamily }> = {
  text: { icon: Article, label: "Read", family: "content" },
  analogy: { icon: Lightbulb, label: "Analogy", family: "content" },
  "worked-example": { icon: PencilLine, label: "Worked example", family: "content" },
  compare: { icon: Columns, label: "Compare", family: "content" },
  chart: { icon: ChartBar, label: "Chart", family: "content" },
  "chart-advanced": { icon: ChartBar, label: "Chart", family: "content" },
  "chart-xl": { icon: ChartBar, label: "Chart", family: "content" },
  video: { icon: VideoCamera, label: "Watch", family: "content" },
  "tree-map": { icon: TreeStructure, label: "Map", family: "content" },
  "graph-diagram": { icon: Graph, label: "Diagram", family: "content" },
  flowchart: { icon: FlowArrow, label: "Flowchart", family: "content" },
  "financial-statement": { icon: Table, label: "Financials", family: "content" },
  timeline: { icon: ClockCounterClockwise, label: "Timeline", family: "content" },
  infographic: { icon: ImageSquare, label: "Infographic", family: "content" },
  "slider-sim": { icon: Sliders, label: "Simulator", family: "interactive" },
  "terminal-sim": { icon: Terminal, label: "Terminal", family: "interactive" },
  simulation: { icon: Cube, label: "Simulation", family: "interactive" },
  mission: { icon: Target, label: "Mission", family: "interactive" },
  "framework-canvas": { icon: SquaresFour, label: "Framework", family: "interactive" },
  whiteboard: { icon: PencilSimpleLine, label: "Whiteboard", family: "interactive" },
  reflection: { icon: NotePencil, label: "Reflection", family: "interactive" },
  "expert-review": { icon: Eyeglasses, label: "Expert review", family: "interactive" },
  quiz: { icon: Question, label: "Quick check", family: "test" },
  "card-sort": { icon: Cards, label: "Card sort", family: "test" },
  "card-match": { icon: Cards, label: "Match", family: "test" },
  hotspot: { icon: Crosshair, label: "Find it", family: "test" },
  scenario: { icon: Path, label: "Scenario", family: "test" },
  "flashcard-deck": { icon: Stack, label: "Flashcards", family: "test" },
};

function BlockSignpost({ type }: { type: string }) {
  const meta = BLOCK_META[type];
  if (!meta) return null;
  const BlockIcon = meta.icon;
  const tone = FAMILY_TONE[meta.family];
  return (
    <div className="flex items-center gap-2 pb-2">
      <BlockIcon size={15} weight="duotone" className={tone} />
      <span className={`text-xs font-semibold uppercase tracking-wider ${tone}`}>
        {meta.label}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

const GENERATING_LINES = [
  "Researching this topic so the lesson is current...",
  "Writing the explanation, analogy, and worked example...",
  "Building the interactive artifacts...",
  "Adding checks for understanding...",
];

/*
  Renders a lesson. If content has not been generated yet, it asks the
  server to build it (generate-once, cached forever). Interactive checks
  feed the mastery score; completing posts progress and unlocks the path
  to the next lesson.
*/
export default function LessonPlayer({
  lessonId,
  lessonTitle,
  initialContent,
  alreadyCompleted,
  previousMastery,
  moduleHref,
  nextHref,
  nextTitle,
}: {
  lessonId: string;
  lessonTitle: string;
  initialContent: LessonContent | null;
  alreadyCompleted: boolean;
  previousMastery: number | null;
  moduleHref: string;
  nextHref: string | null;
  nextTitle: string | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { setLesson, openWithMessage } = useTutor();

  const [content, setContent] = useState<LessonContent | null>(initialContent);
  const [generating, setGenerating] = useState(!initialContent);
  const [genLine, setGenLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<number, number>>({});
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(alreadyCompleted);
  const startedAt = useRef(Date.now());

  // Make the floating Professor aware of this lesson while it is open.
  useEffect(() => {
    setLesson({ lessonId, lessonTitle });
    return () => setLesson(null);
  }, [lessonId, lessonTitle, setLesson]);

  useEffect(() => {
    if (!generating) return;
    const timer = setInterval(
      () => setGenLine((l) => Math.min(l + 1, GENERATING_LINES.length - 1)),
      8000
    );
    return () => clearInterval(timer);
  }, [generating]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setGenLine(0);
    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? `Lesson generation failed with status ${res.status}`);
      }
      setContent(data.content as LessonContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lesson generation failed");
    } finally {
      setGenerating(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (!initialContent) void generate();
  }, [initialContent, generate]);

  const checkScores = Object.values(checks);
  const interactiveCount =
    content?.blocks.filter(
      (b) =>
        b.type === "quiz" ||
        b.type === "card-sort" ||
        b.type === "simulation" ||
        b.type === "reflection" ||
        b.type === "expert-review" ||
        b.type === "card-match" ||
        b.type === "hotspot" ||
        b.type === "whiteboard" ||
        (b.type === "chart-xl" && !!b.probe) ||
        (b.type === "framework-canvas" && b.mode === "presented")
    ).length ?? 0;
  const mastery =
    checkScores.length > 0
      ? Math.round(checkScores.reduce((a, b) => a + b, 0) / checkScores.length)
      : 85;

  async function complete() {
    if (completing) return;
    setCompleting(true);
    setError(null);
    const minutes = Math.max(1, Math.min(240, Math.round((Date.now() - startedAt.current) / 60000)));
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, mastery, minutes }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? `Saving progress failed with status ${res.status}`);
      }
      setCompleted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving progress failed");
    } finally {
      setCompleting(false);
    }
  }

  if (generating) {
    return (
      <div
        className="rounded-2xl border border-accent/25 bg-bg-raised/70 p-10 text-center"
        style={{ boxShadow: "0 0 48px -18px var(--accent-glow)" }}
      >
        <span className="mx-auto grid size-12 animate-pulse place-items-center rounded-2xl bg-accent-soft text-accent">
          <Sparkle size={24} weight="duotone" />
        </span>
        <h1 className="font-display pt-4 text-xl font-semibold text-ink text-balance">{lessonTitle}</h1>
        <p className="pt-2 text-base text-ink-muted">{GENERATING_LINES[genLine]}</p>
        <div className="mx-auto mt-5 h-1 max-w-xs overflow-hidden rounded-full bg-bg-overlay">
          <motion.div
            initial={{ width: "5%" }}
            animate={{ width: ["5%", "90%"] }}
            transition={{ duration: 40, ease: "easeOut" }}
            className="h-full rounded-full bg-accent"
          />
        </div>
        <p className="pt-4 text-xs text-ink-faint">
          This happens once; afterwards the lesson opens instantly.
        </p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-8 text-center">
        <h1 className="font-display text-xl font-semibold text-ink text-balance">{lessonTitle}</h1>
        <p className="mx-auto max-w-md pt-3 text-sm leading-relaxed text-danger">
          {error ?? "The lesson could not be generated."}
        </p>
        <button
          type="button"
          onClick={generate}
          className="mt-5 rounded-xl bg-accent-soft px-5 py-2.5 text-sm font-medium text-accent-bright transition-transform duration-150 active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <article className="flex flex-col gap-4 pb-8">
      <header className="leading-tight">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.012em] text-ink text-balance">
          {lessonTitle}
        </h1>
        <p className="measure pt-2.5 text-base text-accent-bright text-pretty">{content.intro}</p>
        {completed && previousMastery !== null && (
          <p className="pt-2.5 text-sm text-success">
            Completed before with {previousMastery}% mastery. Going through it again only
            makes it stick better.
          </p>
        )}
      </header>

      <MissionProvider>
        <div className="flex flex-col gap-4">
          {content.blocks.map((block, i) => (
            <motion.div
              key={i}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              <BlockSignpost type={block.type} />
              <ArtifactRenderer
                block={block}
                onCheck={(score) => setChecks((c) => ({ ...c, [i]: score }))}
                onDiscuss={openWithMessage}
                lessonId={lessonId}
                blockIndex={i}
              />
            </motion.div>
          ))}
        </div>
      </MissionProvider>

      <footer className="mt-2 rounded-2xl border border-line bg-bg-raised/60 p-5">
        {error && (
          <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm leading-relaxed text-danger">
            {error}
          </p>
        )}
        {interactiveCount > 0 && (
          <p className="pb-3 text-sm text-ink-muted">
            Checks completed:{" "}
            <span className="tabular font-medium text-ink">
              {checkScores.length}/{interactiveCount}
            </span>
            {checkScores.length > 0 && (
              <>
                {" "}
                · current score{" "}
                <span
                  className={`tabular font-semibold ${mastery >= 70 ? "text-success" : "text-warning"}`}
                >
                  {mastery}%
                </span>
              </>
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={complete}
            disabled={completing}
            className="glow-accent-strong flex items-center gap-2 rounded-xl bg-accent-soft px-5 py-2.5 text-sm font-semibold text-accent-bright transition-transform duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle size={16} weight={completed ? "fill" : "duotone"} />
            {completing
              ? "Saving..."
              : completed
                ? "Save progress again"
                : "Complete lesson"}
          </button>
          {completed && nextHref && (
            <Link
              href={nextHref}
              className="flex items-center gap-1.5 rounded-xl border border-line px-5 py-2.5 text-sm text-ink transition-colors duration-150 hover:border-accent/40"
            >
              Next: {nextTitle}
              <ArrowRight size={14} />
            </Link>
          )}
          {completed && !nextHref && (
            <Link
              href={moduleHref}
              className="flex items-center gap-1.5 rounded-xl border border-line px-5 py-2.5 text-sm text-ink transition-colors duration-150 hover:border-accent/40"
            >
              Module complete, take the practical test
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}
