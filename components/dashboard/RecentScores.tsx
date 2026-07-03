"use client";

import { motion } from "motion/react";
import Panel from "@/components/ui/Panel";
import { getTrack } from "@/lib/tracks";
import type { RecentScore } from "@/lib/seed";

export default function RecentScores({ items }: { items: RecentScore[] }) {
  return (
    <Panel
      title="Latest graded work"
      subtitle="Strict rubric scores. Anything under 70 gets a remediation plan."
    >
      <ul className="flex flex-col gap-3">
        {items.map((s, i) => {
          const track = getTrack(s.trackSlug);
          const pct = Math.round((s.score / s.maxScore) * 100);
          const tone =
            pct >= 80 ? "text-success" : pct >= 70 ? "text-ink" : "text-warning";
          return (
            <li key={s.id} data-accent={track?.accent} className="leading-tight">
              <div className="flex items-baseline justify-between gap-3 pb-1.5">
                <p className="min-w-0 truncate text-xs text-ink">{s.assessment}</p>
                <p className={`shrink-0 text-sm font-semibold ${tone}`}>
                  {s.score}
                  <span className="text-[11px] font-normal text-ink-faint">
                    /{s.maxScore}
                  </span>
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-overlay">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.08 * i }}
                  className="h-full rounded-full bg-accent"
                />
              </div>
              <p className="pt-1.5 text-[11px] text-ink-faint">
                {track?.title} · graded {s.gradedLabel}
              </p>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
