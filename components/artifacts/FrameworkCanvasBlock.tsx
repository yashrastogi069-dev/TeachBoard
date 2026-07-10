"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChatCircleDots, GridFour, Scales } from "@phosphor-icons/react";
import Markdown from "@/components/artifacts/Markdown";
import type { FrameworkCanvasBlock as FrameworkCanvasBlockT } from "@/lib/blocks";

/*
  framework-canvas: a configurable grid of labelled cells whose geometry is
  chosen by `framework` (SWOT quadrants, Porter's five forces cross, PESTEL
  6-cell, the classic 9-block Business Model Canvas, or a free custom grid).

  Two modes:
    presented -> every cell shows its worked content; once the learner has
                 scrolled every cell into view the block reports onCheck(100)
                 to mark it engaged.
    drafted   -> every cell is an editable textarea; "Compare to expert
                 analysis" reveals modelAnswer beside what the learner wrote.
                 Reflective, never auto-scored; onDiscuss offers the tutor.
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

type Cell = FrameworkCanvasBlockT["cells"][number];

type Tone = "positive" | "caution" | "danger" | "accent" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  positive: "border-success/25 bg-success/5",
  caution: "border-warning/25 bg-warning/5",
  danger: "border-danger/25 bg-danger/5",
  accent: "border-accent/25 bg-accent-soft/25",
  neutral: "border-line bg-bg-raised/50",
};

const TONE_LABEL: Record<Tone, string> = {
  positive: "text-success",
  caution: "text-warning",
  danger: "text-danger",
  accent: "text-accent-bright",
  neutral: "text-ink-muted",
};

type PlacedCell = { cell: Cell; area?: string; tone: Tone };

type Layout = {
  containerClass: string;
  gridStyle?: React.CSSProperties;
  items: PlacedCell[];
};

function match(label: string, re: RegExp): boolean {
  return re.test(label);
}

/*
  Builds the grid geometry + per-cell tone for a framework. Cells are matched
  to well-known positions by label keyword, with positional fallback so a
  custom-labelled or partial set still lays out sensibly.
*/
function buildLayout(block: FrameworkCanvasBlockT): Layout {
  const cells = block.cells;

  if (block.framework === "swot") {
    const toneFor = (label: string, i: number): Tone => {
      if (match(label, /strength/i)) return "positive";
      if (match(label, /weak/i)) return "caution";
      if (match(label, /opportun/i)) return "accent";
      if (match(label, /threat/i)) return "danger";
      return (["positive", "caution", "accent", "danger"] as Tone[])[i % 4];
    };
    return {
      containerClass: "grid grid-cols-1 gap-3 sm:grid-cols-2",
      items: cells.map((cell, i) => ({ cell, tone: toneFor(cell.label, i) })),
    };
  }

  if (block.framework === "porters-five-forces") {
    // 3x3 plus/cross layout: rivalry in the middle, four forces around it.
    const centerIdx = (() => {
      const found = cells.findIndex((c) => match(c.label, /rivalr|competit/i));
      return found >= 0 ? found : Math.min(2, cells.length - 1);
    })();
    const surrounding = cells.filter((_, i) => i !== centerIdx);
    const areaRing = ["top", "left", "right", "bottom"];
    const items: PlacedCell[] = [];
    cells.forEach((cell, i) => {
      if (i === centerIdx) {
        items.push({ cell, area: "center", tone: "accent" });
      }
    });
    surrounding.forEach((cell, i) => {
      const area = areaRing[i] ?? "bottom";
      items.push({ cell, area, tone: "neutral" });
    });
    return {
      containerClass: "grid gap-3",
      gridStyle: {
        gridTemplateAreas: `". top ." "left center right" ". bottom ."`,
        gridTemplateColumns: "1fr 1.2fr 1fr",
      },
      items,
    };
  }

  if (block.framework === "pestel") {
    return {
      containerClass: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
      items: cells.map((cell) => ({ cell, tone: "neutral" as Tone })),
    };
  }

  if (block.framework === "business-model-canvas") {
    const AREAS = ["kp", "ka", "kr", "vp", "cr", "ch", "cs", "cost", "rev"];
    const areaFor = (label: string, i: number): string => {
      if (match(label, /partner/i)) return "kp";
      if (match(label, /activit/i)) return "ka";
      if (match(label, /resource/i)) return "kr";
      if (match(label, /value|proposition/i)) return "vp";
      if (match(label, /relationship/i)) return "cr";
      if (match(label, /channel/i)) return "ch";
      if (match(label, /segment|customer/i)) return "cs";
      if (match(label, /cost/i)) return "cost";
      if (match(label, /revenue|income/i)) return "rev";
      return AREAS[i] ?? "vp";
    };
    // Guard against two cells resolving to the same area: fall back to the next
    // free standard area in order so the grid never collapses cells on top of
    // each other.
    const used = new Set<string>();
    const items: PlacedCell[] = block.cells.map((cell, i) => {
      let area = areaFor(cell.label, i);
      if (used.has(area)) {
        area = AREAS.find((a) => !used.has(a)) ?? area;
      }
      used.add(area);
      return { cell, area, tone: (area === "vp" ? "accent" : "neutral") as Tone };
    });
    return {
      containerClass: "grid gap-3",
      gridStyle: {
        gridTemplateAreas: `"kp ka vp cr cs" "kp kr vp ch cs" "cost cost cost rev rev"`,
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
      },
      items,
    };
  }

  // custom: responsive auto-fit grid sized to the cell count.
  return {
    containerClass: "grid gap-3",
    gridStyle: {
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    },
    items: cells.map((cell) => ({ cell, tone: "neutral" as Tone })),
  };
}

/* ---------- Presented mode ---------- */

function PresentedCanvas({
  block,
  layout,
  onCheck,
}: {
  block: FrameworkCanvasBlockT;
  layout: Layout;
  onCheck?: (score: number) => void;
}) {
  const reduce = useReducedMotion();
  const seenRef = useRef<Set<string>>(new Set());
  const reportedRef = useRef(false);

  function markSeen(id: string) {
    if (reportedRef.current) return;
    seenRef.current.add(id);
    if (seenRef.current.size >= block.cells.length) {
      reportedRef.current = true;
      onCheck?.(100);
    }
  }

  return (
    <div className={layout.containerClass} style={layout.gridStyle}>
      {layout.items.map(({ cell, area, tone }, i) => (
        <motion.div
          key={cell.id}
          style={area ? { gridArea: area } : undefined}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          onViewportEnter={() => markSeen(cell.id)}
          transition={{ duration: 0.26, ease: EASE, delay: reduce ? 0 : 0.04 * i }}
          className={`flex flex-col gap-1.5 rounded-xl border p-4 ${TONE_CLASS[tone]}`}
        >
          <p
            className={`text-[11px] font-medium uppercase tracking-wider ${TONE_LABEL[tone]}`}
          >
            {cell.label}
          </p>
          <div className="text-sm leading-[1.7] text-ink-muted">
            <Markdown text={cell.content} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Drafted mode ---------- */

function DraftedCanvas({
  block,
  layout,
  onDiscuss,
}: {
  block: FrameworkCanvasBlockT;
  layout: Layout;
  onDiscuss?: (message: string) => void;
}) {
  const reduce = useReducedMotion();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [compared, setCompared] = useState(false);

  const modelById = useMemo(() => {
    const map = new Map<string, string>();
    (block.modelAnswer ?? []).forEach((a) => map.set(a.cellId, a.content));
    return map;
  }, [block.modelAnswer]);

  const drafted = Object.values(drafts).some((v) => v.trim().length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className={layout.containerClass} style={layout.gridStyle}>
        {layout.items.map(({ cell, area, tone }, i) => {
          const model = modelById.get(cell.id);
          const mine = drafts[cell.id] ?? "";
          return (
            <motion.div
              key={cell.id}
              style={area ? { gridArea: area } : undefined}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, ease: EASE, delay: reduce ? 0 : 0.04 * i }}
              className={`flex flex-col gap-2 rounded-xl border p-4 ${TONE_CLASS[tone]}`}
            >
              <p
                className={`text-[11px] font-medium uppercase tracking-wider ${TONE_LABEL[tone]}`}
              >
                {cell.label}
              </p>
              {!compared ? (
                <textarea
                  value={mine}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [cell.id]: e.target.value }))
                  }
                  rows={4}
                  placeholder="Draft your analysis..."
                  aria-label={`Your ${cell.label} analysis`}
                  className="w-full resize-y rounded-lg border border-line bg-bg/60 p-2.5 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:border-accent/50"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="rounded-lg border border-line bg-bg/60 p-2.5">
                    <p className="pb-1 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                      You wrote
                    </p>
                    <p className="text-sm leading-relaxed text-ink">
                      {mine.trim() || (
                        <span className="text-ink-faint">You left this cell blank.</span>
                      )}
                    </p>
                  </div>
                  {model && (
                    <div className="rounded-lg border border-accent/30 bg-accent-soft/25 p-2.5">
                      <p className="pb-1 text-[11px] font-medium uppercase tracking-wider text-accent-bright">
                        Expert analysis
                      </p>
                      <div className="text-sm leading-relaxed text-ink-muted">
                        <Markdown text={model} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!compared ? (
          <button
            type="button"
            onClick={() => setCompared(true)}
            disabled={!drafted}
            className="flex items-center gap-1.5 rounded-lg bg-accent-soft px-4 py-2 text-sm font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Scales size={15} weight="duotone" />
            Compare to expert analysis
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCompared(false)}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:border-accent/40"
          >
            Back to editing
          </button>
        )}
        {onDiscuss && (
          <button
            type="button"
            onClick={() =>
              onDiscuss(
                `I am working through the "${block.title}" framework. Here is my draft: ${
                  block.cells
                    .map((c) => `${c.label}: ${(drafts[c.id] ?? "").trim() || "(blank)"}`)
                    .join(" | ")
                }. How would you critique it?`
              )
            }
            className="flex items-center gap-1.5 text-[11px] text-ink-faint transition-colors hover:text-ink"
          >
            <ChatCircleDots size={13} weight="duotone" />
            Discuss with the Professor
          </button>
        )}
        {!drafted && !compared && (
          <span className="text-[11px] text-ink-faint">
            Fill in at least one cell to compare.
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Entry ---------- */

export function FrameworkCanvasBlock({
  block,
  onCheck,
  onDiscuss,
}: {
  block: FrameworkCanvasBlockT;
  onCheck?: (score: number) => void;
  onDiscuss?: (message: string) => void;
}) {
  const layout = useMemo(() => buildLayout(block), [block]);

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <GridFour size={14} weight="duotone" className="text-accent" />
        {block.mode === "drafted" ? "Draft the framework" : "Worked framework"}
      </p>
      <p className="pb-4 text-base font-medium text-ink">{block.title}</p>

      {block.mode === "presented" ? (
        <PresentedCanvas block={block} layout={layout} onCheck={onCheck} />
      ) : (
        <DraftedCanvas block={block} layout={layout} onDiscuss={onDiscuss} />
      )}
    </div>
  );
}
