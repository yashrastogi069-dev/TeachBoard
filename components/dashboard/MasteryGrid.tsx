"use client";

import { motion } from "motion/react";
import ProgressRing from "@/components/ui/ProgressRing";
import type { TrackMastery } from "@/lib/seed";

export default function MasteryGrid({ items }: { items: TrackMastery[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {items.map(({ track, mastery, modulesDone, modulesTotal }, i) => (
        <motion.div
          key={track.slug}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 * i }}
          data-accent={track.accent}
          className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-bg-raised/70 p-4 text-center transition-colors hover:border-line-strong"
        >
          <ProgressRing value={mastery} size={68} strokeWidth={5} />
          <div className="leading-tight">
            <p className="text-xs font-medium text-ink">{track.title}</p>
            <p className="pt-1 text-[11px] text-ink-faint">
              {modulesDone}/{modulesTotal} modules
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
