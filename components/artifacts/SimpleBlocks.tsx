"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowSquareOut,
  Lightbulb,
  MonitorPlay,
  Wrench,
} from "@phosphor-icons/react";
import Markdown from "@/components/artifacts/Markdown";
import type { LessonBlock } from "@/lib/blocks";

/*
  Non-interactive artifact blocks: text, analogy, worked example, compare,
  chart, flowchart, video. Interactive blocks live in their own files.
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function TextBlock({ block }: { block: Extract<LessonBlock, { type: "text" }> }) {
  return (
    <div>
      <Markdown text={block.markdown} />
    </div>
  );
}

export function AnalogyBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: "analogy" }>;
}) {
  return (
    <aside className="rounded-2xl border border-accent/25 bg-accent-soft/40 p-4">
      <p className="flex items-center gap-2 pb-2 text-[11px] font-medium uppercase tracking-widest text-accent-bright">
        <Lightbulb size={14} weight="duotone" /> Think of it like this
      </p>
      <p className="pb-1 text-sm font-medium text-ink">{block.title}</p>
      <Markdown text={block.markdown} />
    </aside>
  );
}

export function WorkedExampleBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: "worked-example" }>;
}) {
  return (
    <aside className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-2 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <Wrench size={14} weight="duotone" className="text-accent" /> Worked example
      </p>
      <p className="pb-1 text-sm font-medium text-ink">{block.title}</p>
      <Markdown text={block.markdown} />
    </aside>
  );
}

export function CompareBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: "compare" }>;
}) {
  return (
    <div>
      <p className="pb-2 text-sm font-medium text-ink">{block.title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-success/25 bg-success/5 p-4">
          <p className="pb-2 text-[11px] font-medium uppercase tracking-widest text-success">
            {block.goodLabel}
          </p>
          <Markdown text={block.goodMarkdown} />
        </div>
        <div className="rounded-2xl border border-danger/25 bg-danger/5 p-4">
          <p className="pb-2 text-[11px] font-medium uppercase tracking-widest text-danger">
            {block.badLabel}
          </p>
          <Markdown text={block.badMarkdown} />
        </div>
      </div>
    </div>
  );
}

export function ChartBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: "chart" }>;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(...block.series.map((s) => Math.abs(s.value)), 1);
  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="pb-3 text-sm font-medium text-ink">{block.title}</p>
      <div className="flex flex-col gap-2.5">
        {block.series.map((s, i) => (
          <div key={`${s.label}-${i}`} className="leading-tight">
            <div className="flex items-baseline justify-between pb-1">
              <span className="text-xs text-ink-muted">{s.label}</span>
              <span className="tabular text-xs font-medium text-ink">
                {s.value.toLocaleString()}
                {block.unit ? ` ${block.unit}` : ""}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-overlay">
              <motion.div
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${(Math.abs(s.value) / max) * 100}%` }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.05 * i }}
                className="h-full rounded-full bg-accent"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FlowchartBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: "flowchart" }>;
}) {
  const reduce = useReducedMotion();
  // Vertical stepper in node order; consecutive edges become labeled arrows,
  // any remaining edges (loops, skips) are listed as connection notes.
  const consecutive = new Map<string, string | undefined>();
  const extras: string[] = [];
  const labelOf = (id: string) => block.nodes.find((n) => n.id === id)?.label ?? id;
  for (const edge of block.edges) {
    const fromIdx = block.nodes.findIndex((n) => n.id === edge.from);
    const toIdx = block.nodes.findIndex((n) => n.id === edge.to);
    if (toIdx === fromIdx + 1) {
      consecutive.set(edge.from, edge.label);
    } else {
      extras.push(
        `${labelOf(edge.from)} ${edge.label ? `(${edge.label}) ` : ""}connects to ${labelOf(edge.to)}`
      );
    }
  }
  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="pb-3 text-sm font-medium text-ink">{block.title}</p>
      <div className="flex flex-col items-stretch gap-1">
        {block.nodes.map((node, i) => (
          <div key={node.id} className="flex flex-col items-center gap-1">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.22, ease: EASE, delay: 0.04 * i }}
              className="w-full rounded-xl border border-accent/25 bg-accent-soft/30 px-4 py-2.5 text-center text-xs font-medium text-ink"
            >
              {node.label}
            </motion.div>
            {i < block.nodes.length - 1 && (
              <div className="flex items-center gap-1.5 py-0.5 text-ink-faint">
                <ArrowDown size={14} className="text-accent" />
                {consecutive.get(node.id) && (
                  <span className="text-[10px]">{consecutive.get(node.id)}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {extras.length > 0 && (
        <ul className="flex flex-col gap-1 pt-3">
          {extras.map((note) => (
            <li key={note} className="text-[11px] text-ink-faint">
              ↩ {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VideoBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: "video" }>;
}) {
  const href =
    block.url ??
    `https://www.youtube.com/results?search_query=${encodeURIComponent(block.searchQuery)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-line bg-bg/40 p-4 transition-colors duration-150 hover:border-accent/40"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <MonitorPlay size={20} weight="duotone" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-medium text-ink">{block.title}</span>
        <span className="block pt-0.5 text-[11px] text-ink-faint">
          Watch on YouTube <ArrowSquareOut size={10} className="inline" />
        </span>
      </span>
    </a>
  );
}
