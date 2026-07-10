"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChartScatter, GridNine, FlowArrow } from "@phosphor-icons/react";
import type { ChartAdvancedBlock as ChartAdvancedBlockT } from "@/lib/blocks";

/*
  chart-advanced: three magnitude-based variants drawn as hand-built SVG with
  no chart library, matching the existing ChartBlock in SimpleBlocks.tsx.
    bubble  -> scatter of circles sized by `size`, positioned by x/y
    heatmap -> grid where each cell's --accent opacity maps from its value
    sankey  -> simplified multi-column flow, band thickness ~ link value
  Colors come from CSS variables only (--accent via currentColor / color-mix).
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

/* ---------- Bubble ---------- */

function BubbleChart({
  block,
}: {
  block: ChartAdvancedBlockT;
}) {
  const reduce = useReducedMotion();
  const points = block.bubblePoints ?? [];

  const W = 520;
  const H = 320;
  const pad = 44;

  const geometry = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const sizes = points.map((p) => p.size);
    const xLo = Math.min(...xs);
    const xHi = Math.max(...xs);
    const yLo = Math.min(...ys);
    const yHi = Math.max(...ys);
    const sizeHi = Math.max(...sizes, 1);
    const xSpan = xHi - xLo || 1;
    const ySpan = yHi - yLo || 1;

    const sx = (x: number) => pad + ((x - xLo) / xSpan) * (W - pad * 2);
    const sy = (y: number) => H - pad - ((y - yLo) / ySpan) * (H - pad * 2);
    const sr = (s: number) => 8 + (Math.sqrt(s) / Math.sqrt(sizeHi)) * 30;

    return { sx, sy, sr };
  }, [points]);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${block.title}: bubble chart of ${points.length} items`}
      >
        {/* frame axes */}
        <line
          x1={pad}
          y1={H - pad}
          x2={W - pad}
          y2={H - pad}
          stroke="currentColor"
          strokeWidth={1}
          className="text-line-strong"
        />
        <line
          x1={pad}
          y1={pad}
          x2={pad}
          y2={H - pad}
          stroke="currentColor"
          strokeWidth={1}
          className="text-line-strong"
        />
        {points.map((p, i) => {
          const cx = geometry.sx(p.x);
          const cy = geometry.sy(p.y);
          const r = geometry.sr(p.size);
          return (
            <motion.g
              key={`${p.label}-${i}`}
              initial={reduce ? false : { opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, ease: EASE, delay: reduce ? 0 : 0.05 * i }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={r}
                className="text-accent"
                fill="color-mix(in oklab, currentColor 26%, transparent)"
                stroke="currentColor"
                strokeWidth={1.5}
              />
              <text
                x={cx}
                y={cy - r - 4}
                textAnchor="middle"
                className="fill-[color:var(--text-muted)] text-[11px]"
              >
                {p.label}
              </text>
            </motion.g>
          );
        })}
      </svg>
      <p className="pt-1 text-[11px] text-ink-faint">
        Horizontal and vertical position plot each item; bubble area shows
        {block.unit ? ` ${block.unit}` : " magnitude"}.
      </p>
    </div>
  );
}

/* ---------- Heatmap ---------- */

function HeatmapChart({
  block,
}: {
  block: ChartAdvancedBlockT;
}) {
  const reduce = useReducedMotion();
  const grid = block.heatmapGrid;

  const { lo, span } = useMemo(() => {
    if (!grid) return { lo: 0, span: 1 };
    const flat = grid.values.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    return { lo: min, span: max - min || 1 };
  }, [grid]);

  if (!grid) return null;

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-fit gap-1"
        style={{
          gridTemplateColumns: `minmax(80px, auto) repeat(${grid.colLabels.length}, minmax(56px, 1fr))`,
        }}
      >
        {/* header row */}
        <div aria-hidden />
        {grid.colLabels.map((col, c) => (
          <div
            key={`col-${c}`}
            className="px-1 pb-1 text-center text-[11px] font-medium text-ink-muted"
          >
            {col}
          </div>
        ))}

        {grid.rowLabels.map((row, r) => (
          <div key={`row-${r}`} className="contents">
            <div className="flex items-center pr-2 text-right text-[11px] font-medium text-ink-muted">
              {row}
            </div>
            {grid.colLabels.map((_, c) => {
              const value = grid.values[r]?.[c] ?? 0;
              const intensity = Math.round(((value - lo) / span) * 100);
              const strong = intensity >= 55;
              return (
                <motion.div
                  key={`cell-${r}-${c}`}
                  initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.3,
                    ease: EASE,
                    delay: reduce ? 0 : 0.015 * (r * grid.colLabels.length + c),
                  }}
                  title={`${grid.rowLabels[r]} · ${grid.colLabels[c]}: ${value.toLocaleString()}${
                    block.unit ? ` ${block.unit}` : ""
                  }`}
                  className="grid aspect-[3/2] place-items-center rounded-md border border-line"
                  style={{
                    backgroundColor: `color-mix(in oklab, var(--accent) ${Math.max(
                      6,
                      intensity
                    )}%, var(--bg-raised))`,
                  }}
                >
                  <span
                    className={`tabular text-[11px] font-medium ${
                      strong ? "text-white" : "text-ink-muted"
                    }`}
                  >
                    {value.toLocaleString()}
                  </span>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="pt-2 text-[11px] text-ink-faint">
        Deeper fill means a higher value{block.unit ? ` (${block.unit})` : ""}.
      </p>
    </div>
  );
}

/* ---------- Sankey ---------- */

type SankeyNode = { id: string; label: string };
type SankeyLink = { from: string; to: string; value: number };

type LaidNode = {
  id: string;
  label: string;
  depth: number;
  value: number;
  x: number;
  y0: number;
  y1: number;
};

function SankeyChart({
  block,
}: {
  block: ChartAdvancedBlockT;
}) {
  const reduce = useReducedMotion();
  const flow = block.sankeyFlow;

  const W = 640;
  const H = 340;
  const padY = 16;
  const nodeW = 14;
  const gap = 16;

  const model = useMemo(() => {
    if (!flow) return null;
    const nodes: SankeyNode[] = flow.nodes;
    const links: SankeyLink[] = flow.links;

    // Depth via relaxation (DAG-safe; capped so a stray cycle can't loop).
    const depth = new Map<string, number>(nodes.map((n) => [n.id, 0]));
    for (let iter = 0; iter < nodes.length; iter++) {
      let changed = false;
      links.forEach((l) => {
        const d = (depth.get(l.from) ?? 0) + 1;
        if (d > (depth.get(l.to) ?? 0)) {
          depth.set(l.to, d);
          changed = true;
        }
      });
      if (!changed) break;
    }

    // Node throughput = max(sum in, sum out); columns grouped by depth.
    const inSum = new Map<string, number>();
    const outSum = new Map<string, number>();
    links.forEach((l) => {
      outSum.set(l.from, (outSum.get(l.from) ?? 0) + l.value);
      inSum.set(l.to, (inSum.get(l.to) ?? 0) + l.value);
    });

    const columns = new Map<number, SankeyNode[]>();
    nodes.forEach((n) => {
      const d = depth.get(n.id) ?? 0;
      if (!columns.has(d)) columns.set(d, []);
      columns.get(d)!.push(n);
    });
    const maxDepth = Math.max(...nodes.map((n) => depth.get(n.id) ?? 0));

    // Scale so the tallest column of throughput fits the plot height.
    let tallest = 1;
    columns.forEach((colNodes) => {
      const total = colNodes.reduce(
        (sum, n) => sum + Math.max(inSum.get(n.id) ?? 0, outSum.get(n.id) ?? 0, 1),
        0
      );
      tallest = Math.max(tallest, total);
    });
    const usableH = H - padY * 2;
    const maxGaps = Math.max(...[...columns.values()].map((c) => c.length - 1), 0);
    const valueScale = (usableH - maxGaps * gap) / tallest;

    const laid = new Map<string, LaidNode>();
    columns.forEach((colNodes, d) => {
      const x = maxDepth === 0 ? padY : padY + (d / maxDepth) * (W - padY * 2 - nodeW);
      const heights = colNodes.map(
        (n) => Math.max(inSum.get(n.id) ?? 0, outSum.get(n.id) ?? 0, 1) * valueScale
      );
      const colHeight = heights.reduce((a, b) => a + b, 0) + (colNodes.length - 1) * gap;
      let cursor = padY + (usableH - colHeight) / 2;
      colNodes.forEach((n, i) => {
        const h = heights[i];
        laid.set(n.id, {
          id: n.id,
          label: n.label,
          depth: d,
          value: Math.max(inSum.get(n.id) ?? 0, outSum.get(n.id) ?? 0, 1),
          x,
          y0: cursor,
          y1: cursor + h,
        });
        cursor += h + gap;
      });
    });

    // Stack the ribbons at each node's edges in link order.
    const outCursor = new Map<string, number>();
    const inCursor = new Map<string, number>();
    const ribbons = links.map((l, i) => {
      const src = laid.get(l.from);
      const dst = laid.get(l.to);
      if (!src || !dst) return null;
      const thickness = l.value * valueScale;
      const sy = (outCursor.get(l.from) ?? src.y0);
      const dy = (inCursor.get(l.to) ?? dst.y0);
      outCursor.set(l.from, sy + thickness);
      inCursor.set(l.to, dy + thickness);
      const x0 = src.x + nodeW;
      const x1 = dst.x;
      const xm = (x0 + x1) / 2;
      const syc = sy + thickness / 2;
      const dyc = dy + thickness / 2;
      const path = `M ${x0} ${syc} C ${xm} ${syc}, ${xm} ${dyc}, ${x1} ${dyc}`;
      return { key: `${l.from}-${l.to}-${i}`, path, thickness, value: l.value };
    });

    return { laid: [...laid.values()], ribbons: ribbons.filter(Boolean) as NonNullable<
      (typeof ribbons)[number]
    >[] };
  }, [flow]);

  if (!flow || !model) return null;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[520px]"
        role="img"
        aria-label={`${block.title}: flow diagram`}
      >
        <g className="text-accent">
          {model.ribbons.map((rb, i) => (
            <motion.path
              key={rb.key}
              d={rb.path}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.28}
              strokeWidth={Math.max(1, rb.thickness)}
              strokeLinecap="butt"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: EASE, delay: reduce ? 0 : 0.04 * i }}
            />
          ))}
        </g>
        {model.laid.map((n) => {
          const anchorRight = n.x < W / 2;
          return (
            <g key={n.id}>
              <rect
                x={n.x}
                y={n.y0}
                width={nodeW}
                height={Math.max(2, n.y1 - n.y0)}
                rx={2}
                className="fill-[color:var(--accent-bright)]"
              />
              <text
                x={anchorRight ? n.x + nodeW + 6 : n.x - 6}
                y={(n.y0 + n.y1) / 2}
                textAnchor={anchorRight ? "start" : "end"}
                dominantBaseline="middle"
                className="fill-[color:var(--text)] text-[11px] font-medium"
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="pt-1 text-[11px] text-ink-faint">
        Band thickness is proportional to flow{block.unit ? ` (${block.unit})` : ""}.
      </p>
    </div>
  );
}

/* ---------- Entry ---------- */

const VARIANT_META: Record<
  ChartAdvancedBlockT["variant"],
  { label: string; icon: typeof ChartScatter }
> = {
  bubble: { label: "Bubble chart", icon: ChartScatter },
  heatmap: { label: "Heatmap", icon: GridNine },
  sankey: { label: "Flow diagram", icon: FlowArrow },
};

export function ChartAdvancedBlock({
  block,
}: {
  block: ChartAdvancedBlockT;
}) {
  const meta = VARIANT_META[block.variant];
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <Icon size={14} weight="duotone" className="text-accent" />
        {meta.label}
      </p>
      <p className="pb-3 text-base font-medium text-ink">{block.title}</p>

      {block.variant === "bubble" && <BubbleChart block={block} />}
      {block.variant === "heatmap" && <HeatmapChart block={block} />}
      {block.variant === "sankey" && <SankeyChart block={block} />}
    </div>
  );
}
