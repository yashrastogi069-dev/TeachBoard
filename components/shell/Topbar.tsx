"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CaretDown, Fire, Gauge } from "@phosphor-icons/react";
import { seed } from "@/lib/seed";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function Topbar() {
  const [statsOpen, setStatsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!statsOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setStatsOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [statsOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-bg/80 px-6 backdrop-blur">
      <div className="leading-tight">
        <p className="font-display text-sm font-semibold text-ink">Dashboard</p>
        <p className="text-[11px] text-ink-faint">All tracks, one view</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span
          className="flex items-center gap-1.5 rounded-full border border-line bg-bg-raised px-3 py-1.5 text-xs text-ink-muted"
          title="Days in a row with learning activity"
        >
          <Fire size={14} weight="duotone" className="text-warning" />
          <span className="tabular font-medium text-ink">
            {seed.streakDays} day streak
          </span>
        </span>

        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setStatsOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-bg-raised px-3 py-1.5 text-xs text-ink-muted transition-colors duration-150 hover:border-line-strong hover:text-ink active:scale-[0.97]"
          >
            <Gauge size={14} weight="duotone" className="text-accent" />
            <span className="tabular font-medium text-ink">
              {seed.overallMastery}% mastery
            </span>
            <CaretDown
              size={14}
              className={`transition-transform duration-150 ${
                statsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {statsOpen && (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.95 }}
                transition={{ duration: 0.15, ease: EASE }}
                className="absolute right-0 top-11 w-72 origin-top-right rounded-xl border border-line bg-bg-overlay p-4 shadow-2xl shadow-black/50"
              >
                <p className="pb-3 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
                  Mastery by track
                </p>
                <div className="flex flex-col gap-3">
                  {seed.trackMastery.map(({ track, mastery }) => (
                    <div key={track.slug} data-accent={track.accent}>
                      <div className="flex items-baseline justify-between pb-1">
                        <span className="text-xs text-ink-muted">{track.title}</span>
                        <span className="tabular text-xs font-medium text-ink">
                          {mastery}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-bg-raised">
                        <motion.div
                          initial={reduce ? false : { width: 0 }}
                          animate={{ width: `${mastery}%` }}
                          transition={{ duration: 0.5, ease: EASE }}
                          className="h-full rounded-full bg-accent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="pt-3 text-[11px] text-ink-faint">
                  This popover keeps global progress one click away from any page,
                  however deep you are inside a track.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-bright">
          Y
        </span>
      </div>
    </header>
  );
}
