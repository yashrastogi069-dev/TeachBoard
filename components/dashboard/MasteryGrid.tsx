"use client";

import { motion, useReducedMotion } from "motion/react";
import ProgressRing from "@/components/ui/ProgressRing";
import type { TrackMastery } from "@/lib/seed";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function MasteryGrid({ items }: { items: TrackMastery[] }) {
  const reduce = useReducedMotion();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(({ track, mastery, modulesDone, modulesTotal }, i) => (
        <motion.div
          key={track.slug}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: EASE, delay: 0.04 * i }}
          data-accent={track.accent}
          className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-bg-raised/70 p-4 text-center transition-colors duration-150 hover:border-accent/30"
        >
          <ProgressRing value={mastery} size={68} strokeWidth={5} />
          <div className="leading-tight">
            <p className="text-xs font-medium text-ink">{track.title}</p>
            <p className="tabular pt-1 text-[11px] text-ink-faint">
              {modulesDone}/{modulesTotal} modules
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
