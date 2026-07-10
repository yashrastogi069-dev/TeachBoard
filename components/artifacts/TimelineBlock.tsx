"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CaretRight, Funnel, MapPin } from "@phosphor-icons/react";
import Markdown from "@/components/artifacts/Markdown";
import type { TimelineBlock as TimelineBlockT } from "@/lib/blocks";

/*
  TimelineBlock: a vertical timeline (reads cleanly at every width, so no
  desktop/mobile fork). Each event sits on a rail with a marker; the header is
  a button that expands to reveal detail markdown. Optional category chips
  filter which events show. If currentPositionEventId is set, that event gets a
  distinct "you are here" marker. All motion is gated by useReducedMotion and
  all color comes from CSS variables so track theming keeps working.
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

type TimelineEvent = TimelineBlockT["events"][number];

export default function TimelineBlock({ block }: { block: TimelineBlockT }) {
  const reduce = useReducedMotion();

  // Filter chips come from the explicit categories list when provided, else
  // from whatever categories the events actually carry.
  const categories = useMemo(() => {
    if (block.categories && block.categories.length > 0) return block.categories;
    const seen = new Set<string>();
    block.events.forEach((e) => e.category && seen.add(e.category));
    return [...seen];
  }, [block.categories, block.events]);

  const [active, setActive] = useState<Set<string>>(() => new Set(categories));
  const [openId, setOpenId] = useState<string | null>(null);

  function toggleCategory(cat: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Events with no category always show; categorized events show when their
  // category is active (an empty active set means "show everything").
  const visible = block.events.filter(
    (e) => !e.category || active.size === 0 || active.has(e.category)
  );

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="pb-3 text-sm font-medium text-ink">{block.title}</p>

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-ink-faint">
            <Funnel size={13} weight="duotone" className="text-accent" />
            Filter
          </span>
          {categories.map((cat) => {
            const on = active.has(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                aria-pressed={on}
                className={`shrink-0 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors duration-150 active:scale-[0.97] ${
                  on
                    ? "border-accent/60 bg-accent-soft text-accent-bright"
                    : "border-line bg-bg-raised/50 text-ink-faint hover:border-line-strong hover:text-ink-muted"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-line bg-bg-raised/40 p-3 text-xs text-ink-faint">
          No events match the selected filters. Turn a category back on to see them.
        </p>
      ) : (
        <ol className="relative">
          {/* the rail */}
          <div
            className="absolute bottom-2 left-[7px] top-2 w-px bg-line-strong"
            aria-hidden
          />
          <AnimatePresence initial={false}>
            {visible.map((event, i) => (
              <TimelineRow
                key={event.id}
                event={event}
                index={i}
                reduce={!!reduce}
                isCurrent={block.currentPositionEventId === event.id}
                isOpen={openId === event.id}
                onToggle={() =>
                  setOpenId((cur) => (cur === event.id ? null : event.id))
                }
              />
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}

function TimelineRow({
  event,
  index,
  reduce,
  isCurrent,
  isOpen,
  onToggle,
}: {
  event: TimelineEvent;
  index: number;
  reduce: boolean;
  isCurrent: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.li
      layout={reduce ? false : "position"}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.26,
        ease: EASE,
        delay: reduce ? 0 : Math.min(index, 10) * 0.04,
      }}
      className="relative pb-3 pl-8 last:pb-0"
    >
      {/* marker */}
      <span
        className={`absolute left-0 top-1.5 flex size-[15px] items-center justify-center rounded-full border-2 ${
          isCurrent
            ? "glow-accent border-accent bg-accent"
            : "border-line-strong bg-bg-raised"
        }`}
        aria-hidden
      >
        {isCurrent ? (
          <MapPin size={9} weight="fill" className="text-[color:var(--bg)]" />
        ) : (
          <span className="size-1.5 rounded-full bg-accent/60" />
        )}
      </span>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150 active:scale-[0.99] ${
          isCurrent
            ? "border-accent/50 bg-accent-soft/30"
            : isOpen
              ? "border-accent/40 bg-accent-soft/20"
              : "border-line bg-bg-raised/50 hover:border-line-strong"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular text-[11px] font-medium uppercase tracking-wider text-accent-bright">
              {event.date}
            </span>
            {event.category && (
              <span className="shrink-0 whitespace-nowrap rounded-md border border-line bg-bg/60 px-1.5 py-0.5 text-[10px] text-ink-faint">
                {event.category}
              </span>
            )}
            {isCurrent && (
              <span className="shrink-0 whitespace-nowrap rounded-md border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-bright">
                You are here
              </span>
            )}
          </div>
          <p className="pt-1 text-sm font-medium text-ink">{event.title}</p>
        </div>
        <CaretRight
          size={13}
          weight="bold"
          className={`mt-1 shrink-0 text-ink-faint transition-transform duration-150 ${
            isOpen ? "rotate-90 text-accent" : ""
          }`}
        />
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
            <div className="px-3 pt-2">
              <Markdown text={event.detail} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
