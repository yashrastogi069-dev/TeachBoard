"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  ArrowsOutCardinal,
  CaretRight,
  CheckCircle,
  FlowArrow,
  Graph,
  TreeStructure,
} from "@phosphor-icons/react";
import type { GraphDiagramBlock as GraphDiagramBlockT } from "@/lib/blocks";

/*
  GraphDiagramBlock: one component, three hand-built visual modes chosen by
  block.layout (no d3, no react-flow, matching how the tree-map and chart
  blocks are drawn by hand):

    flow    -> a "Next step" walk-through along the nodes in edge order. Each
               step highlights the active node with accent glow and fades in
               the next one, so the sequence of a process reads as motion.
    tree    -> hierarchical, click-to-expand layout starting at rootId, with
               indent guide lines. Children are read from edges (from -> to).
    network -> a static force-directed layout (Fruchterman-Reingold) computed
               once on mount, no animation loop. Nodes are draggable with
               pointer events and the SVG edges follow the drag live.

  All colors come from CSS variables so track theming keeps working, and every
  animation is gated behind useReducedMotion.
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

type GraphNode = GraphDiagramBlockT["nodes"][number];
type GraphEdge = GraphDiagramBlockT["edges"][number];

const MODE_META = {
  flow: { icon: FlowArrow, label: "Process flow" },
  tree: { icon: TreeStructure, label: "Hierarchy" },
  network: { icon: Graph, label: "Network map" },
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function GraphDiagramBlock({ block }: { block: GraphDiagramBlockT }) {
  const Meta = MODE_META[block.layout];
  const Icon = Meta.icon;

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <Icon size={14} weight="duotone" className="text-accent" /> {Meta.label}
      </p>
      <p className="pb-3 text-sm font-medium text-ink">{block.title}</p>

      {block.layout === "flow" && <FlowView block={block} />}
      {block.layout === "tree" && <TreeView block={block} />}
      {block.layout === "network" && <NetworkView block={block} />}
    </div>
  );
}

/* ---------- flow ---------- */

/*
  Walks the nodes in edge order: start at a node with no incoming edge (a true
  source), then follow one outgoing edge at a time. Any node the chain never
  reaches is appended in declared order so nothing is silently dropped.
*/
function orderFlow(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const targets = new Set(edges.map((e) => e.to));
  const start = nodes.find((n) => !targets.has(n.id)) ?? nodes[0];
  const seq: GraphNode[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = start?.id;
  while (cur && byId.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    seq.push(byId.get(cur)!);
    const next = edges.find((e) => e.from === cur && !seen.has(e.to));
    cur = next?.to;
  }
  for (const n of nodes) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      seq.push(n);
    }
  }
  return seq;
}

function FlowView({ block }: { block: GraphDiagramBlockT }) {
  const reduce = useReducedMotion();
  const seq = useMemo(() => orderFlow(block.nodes, block.edges), [block.nodes, block.edges]);
  const [active, setActive] = useState(0);

  const edgeLabel = useCallback(
    (fromId: string, toId: string) =>
      block.edges.find((e) => e.from === fromId && e.to === toId)?.label,
    [block.edges]
  );

  const atEnd = active >= seq.length - 1;

  return (
    <div>
      <ol className="flex flex-col">
        {seq.map((node, i) => {
          const state = i < active ? "done" : i === active ? "active" : "upcoming";
          const label = i > 0 ? edgeLabel(seq[i - 1].id, node.id) : undefined;
          return (
            <li key={node.id}>
              {i > 0 && (
                <div className="ml-4 flex items-center gap-2 py-1" aria-hidden>
                  <div
                    className={`h-6 w-px ${i <= active ? "bg-accent/70" : "bg-line-strong"}`}
                  />
                  <ArrowRight
                    size={12}
                    className={i <= active ? "text-accent" : "text-ink-faint"}
                  />
                  {label && (
                    <span
                      className={`text-[11px] ${i <= active ? "text-accent-bright" : "text-ink-faint"}`}
                    >
                      {label}
                    </span>
                  )}
                </div>
              )}
              <motion.div
                initial={false}
                animate={
                  reduce
                    ? { opacity: state === "upcoming" ? 0.5 : 1 }
                    : {
                        opacity: state === "upcoming" ? 0.5 : 1,
                        scale: state === "active" ? 1 : 0.995,
                      }
                }
                transition={{ duration: 0.24, ease: EASE }}
                className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${
                  state === "active"
                    ? "glow-accent border-accent/60 bg-accent-soft"
                    : state === "done"
                      ? "border-line-strong bg-bg-raised/70"
                      : "border-line bg-bg-raised/30"
                }`}
              >
                <span
                  className={`tabular mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    state === "active"
                      ? "bg-accent text-[color:var(--bg)]"
                      : state === "done"
                        ? "bg-success/15 text-success"
                        : "bg-bg-overlay text-ink-faint"
                  }`}
                >
                  {state === "done" ? <CheckCircle size={14} weight="fill" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      state === "upcoming" ? "text-ink-muted" : "text-ink"
                    }`}
                  >
                    {node.label}
                  </p>
                  {node.detail && state !== "upcoming" && (
                    <p className="pt-0.5 text-xs leading-relaxed text-ink-muted">{node.detail}</p>
                  )}
                </div>
              </motion.div>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-3 pt-3">
        <button
          type="button"
          onClick={() => setActive((a) => Math.max(0, a - 1))}
          disabled={active === 0}
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition-colors duration-150 hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={13} weight="bold" />
          Back
        </button>
        <button
          type="button"
          onClick={() => setActive((a) => Math.min(seq.length - 1, a + 1))}
          disabled={atEnd}
          className="flex items-center gap-1.5 rounded-lg bg-accent-soft px-4 py-2 text-xs font-medium text-accent-bright transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {atEnd ? "End of flow" : "Next step"}
          {!atEnd && <ArrowRight size={13} weight="bold" />}
        </button>
        <span className="tabular text-[11px] text-ink-faint">
          Step {active + 1}/{seq.length}
        </span>
        {active > 0 && (
          <button
            type="button"
            onClick={() => setActive(0)}
            className="ml-auto flex items-center gap-1 text-[11px] text-ink-faint transition-colors hover:text-ink"
          >
            <ArrowClockwise size={12} weight="bold" />
            Restart
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- tree ---------- */

function TreeView({ block }: { block: GraphDiagramBlockT }) {
  const reduce = useReducedMotion();
  const byId = useMemo(() => new Map(block.nodes.map((n) => [n.id, n])), [block.nodes]);
  const childMap = useMemo(() => {
    const m = new Map<string, Array<{ id: string; label?: string }>>();
    block.edges.forEach((e) => {
      if (!m.has(e.from)) m.set(e.from, []);
      m.get(e.from)!.push({ id: e.to, label: e.label });
    });
    return m;
  }, [block.edges]);

  const rootId = block.rootId && byId.has(block.rootId) ? block.rootId : block.nodes[0]?.id;
  const [open, setOpen] = useState<Set<string>>(() => new Set(rootId ? [rootId] : []));

  const toggle = useCallback((id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!rootId) {
    return <p className="text-xs text-ink-faint">This tree has no nodes to show.</p>;
  }

  // ancestors guards against malformed cyclic data so the render can never loop.
  function renderNode(id: string, depth: number, ancestors: Set<string>, edgeLabel?: string) {
    const node = byId.get(id);
    if (!node || ancestors.has(id)) return null;
    const kids = childMap.get(id) ?? [];
    const hasKids = kids.length > 0;
    const isOpen = open.has(id);

    return (
      <div key={id} className={depth > 0 ? "pt-2" : ""}>
        <button
          type="button"
          onClick={() => hasKids && toggle(id)}
          aria-expanded={hasKids ? isOpen : undefined}
          disabled={!hasKids}
          className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150 ${
            hasKids ? "active:scale-[0.99]" : "cursor-default"
          } ${
            depth === 0
              ? "border-accent/40 bg-accent-soft/40"
              : isOpen && hasKids
                ? "border-accent/40 bg-accent-soft/25"
                : "border-line bg-bg-raised/50 hover:border-line-strong"
          }`}
        >
          {hasKids ? (
            <CaretRight
              size={12}
              weight="bold"
              className={`shrink-0 text-accent transition-transform duration-150 ${
                isOpen ? "rotate-90" : ""
              }`}
            />
          ) : (
            <span className="size-1.5 shrink-0 rounded-full bg-accent/50" aria-hidden />
          )}
          {edgeLabel && (
            <span className="shrink-0 whitespace-nowrap rounded-md border border-line bg-bg/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              {edgeLabel}
            </span>
          )}
          <span
            className={`min-w-0 text-sm font-medium ${depth === 0 ? "text-accent-bright" : "text-ink"}`}
          >
            {node.label}
          </span>
        </button>

        {node.detail && (
          <p className="px-3 pt-1 text-xs leading-relaxed text-ink-muted">{node.detail}</p>
        )}

        <AnimatePresence initial={false}>
          {isOpen && hasKids && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="ml-3 border-l border-line pl-3">
                {kids.map((k) =>
                  renderNode(k.id, depth + 1, new Set([...ancestors, id]), k.label)
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div>
      {renderNode(rootId, 0, new Set())}
      <p className="pt-3 text-[11px] text-ink-faint">
        Click a branch to expand or collapse it.
      </p>
    </div>
  );
}

/* ---------- network ---------- */

type Pt = { x: number; y: number };

/*
  Deterministic force-directed layout in a normalized 0-100 space. Nodes start
  evenly on a circle (seeded by index, so no randomness) then a fixed number of
  Fruchterman-Reingold iterations spread them out: every pair repels, every edge
  pulls together, with a cooling schedule. Computed once via useMemo; there is
  no per-frame animation loop.
*/
function computeLayout(nodes: GraphNode[], edges: GraphEdge[]): Record<string, Pt> {
  const N = nodes.length;
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const pos: Pt[] = nodes.map((_, i) => {
    const a = (i / Math.max(N, 1)) * Math.PI * 2;
    return { x: 50 + 32 * Math.cos(a), y: 50 + 32 * Math.sin(a) };
  });
  const links = edges.filter((e) => idx.has(e.from) && idx.has(e.to));
  const k = 100 / Math.sqrt(Math.max(N, 1));
  let temp = 20;

  for (let it = 0; it < 140; it++) {
    const disp: Pt[] = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const rep = (k * k) / dist;
        const ux = dx / dist;
        const uy = dy / dist;
        disp[i].x += ux * rep;
        disp[i].y += uy * rep;
        disp[j].x -= ux * rep;
        disp[j].y -= uy * rep;
      }
    }
    for (const e of links) {
      const i = idx.get(e.from)!;
      const j = idx.get(e.to)!;
      const dx = pos[i].x - pos[j].x;
      const dy = pos[i].y - pos[j].y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const att = (dist * dist) / k;
      const ux = dx / dist;
      const uy = dy / dist;
      disp[i].x -= ux * att;
      disp[i].y -= uy * att;
      disp[j].x += ux * att;
      disp[j].y += uy * att;
    }
    for (let i = 0; i < N; i++) {
      const d = Math.hypot(disp[i].x, disp[i].y) || 0.01;
      pos[i].x = clamp(pos[i].x + (disp[i].x / d) * Math.min(d, temp), 7, 93);
      pos[i].y = clamp(pos[i].y + (disp[i].y / d) * Math.min(d, temp), 9, 91);
    }
    temp *= 0.95;
  }

  const out: Record<string, Pt> = {};
  nodes.forEach((n, i) => {
    out[n.id] = pos[i];
  });
  return out;
}

function NetworkView({ block }: { block: GraphDiagramBlockT }) {
  const reduce = useReducedMotion();
  const layout = useMemo(
    () => computeLayout(block.nodes, block.edges),
    [block.nodes, block.edges]
  );
  const [positions, setPositions] = useState<Record<string, Pt>>(layout);
  const [selected, setSelected] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ id: string; moved: boolean } | null>(null);

  const byId = useMemo(() => new Map(block.nodes.map((n) => [n.id, n])), [block.nodes]);
  const links = useMemo(
    () =>
      block.edges.filter(
        (e) => positions[e.from] !== undefined && positions[e.to] !== undefined
      ),
    [block.edges, positions]
  );

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>, id: string) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { id, moved: false };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current.moved = true;
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 4, 96);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 6, 94);
    setPositions((p) => ({ ...p, [drag.current!.id]: { x, y } }));
  }

  function onPointerUp(_e: ReactPointerEvent<HTMLButtonElement>, id: string) {
    const wasDrag = drag.current?.moved;
    drag.current = null;
    if (!wasDrag) setSelected((s) => (s === id ? null : id));
  }

  const selectedNode = selected ? byId.get(selected) : null;

  return (
    <div>
      <motion.div
        ref={containerRef}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, ease: EASE }}
        className="relative h-[340px] w-full touch-none overflow-hidden rounded-xl border border-line bg-bg-inset/60"
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          {links.map((e, i) => {
            const a = positions[e.from];
            const b = positions[e.to];
            const lit = selected === e.from || selected === e.to;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="currentColor"
                strokeWidth={lit ? 2 : 1}
                vectorEffect="non-scaling-stroke"
                className={lit ? "text-accent" : "text-[color:var(--border-strong)]"}
              />
            );
          })}
        </svg>

        {/* Edge labels as HTML so the stretched viewBox never distorts text. */}
        {links.map((e, i) =>
          e.label ? (
            <span
              key={`l-${i}`}
              style={{
                left: `${(positions[e.from].x + positions[e.to].x) / 2}%`,
                top: `${(positions[e.from].y + positions[e.to].y) / 2}%`,
              }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-bg-inset/80 px-1 text-[10px] text-ink-faint"
            >
              {e.label}
            </span>
          ) : null
        )}

        {block.nodes.map((node) => {
          const p = positions[node.id];
          if (!p) return null;
          const isSel = selected === node.id;
          return (
            <button
              key={node.id}
              type="button"
              onPointerDown={(e) => onPointerDown(e, node.id)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, node.id)}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              className={`absolute max-w-[42%] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none truncate rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 active:cursor-grabbing ${
                isSel
                  ? "glow-accent z-10 border-accent/70 bg-accent-soft text-accent-bright"
                  : "border-line-strong bg-bg-raised text-ink hover:border-accent/50"
              }`}
            >
              {node.label}
            </button>
          );
        })}
      </motion.div>

      <div className="flex items-center gap-3 pt-3">
        <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
          <ArrowsOutCardinal size={13} weight="duotone" className="text-accent" />
          Drag any node to rearrange. Tap one to read its detail.
        </span>
        <button
          type="button"
          onClick={() => {
            setPositions(layout);
            setSelected(null);
          }}
          className="ml-auto flex items-center gap-1 text-[11px] text-ink-faint transition-colors hover:text-ink"
        >
          <ArrowClockwise size={12} weight="bold" />
          Reset layout
        </button>
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="mt-3 rounded-xl border border-accent/30 bg-accent-soft/20 p-3"
          >
            <p className="text-sm font-medium text-ink">{selectedNode.label}</p>
            {selectedNode.detail ? (
              <p className="pt-1 text-xs leading-relaxed text-ink-muted">{selectedNode.detail}</p>
            ) : (
              <p className="pt-1 text-xs text-ink-faint">No extra detail for this node.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
