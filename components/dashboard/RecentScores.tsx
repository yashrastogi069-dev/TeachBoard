"use client";

import { motion, useReducedMotion } from "motion/react";
import Panel from "@/components/ui/Panel";
import { getTrack } from "@/lib/tracks";
import type { RecentScore } from "@/lib/seed";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function RecentScores({ items }: { items: RecentScore[] }) {
  const reduce = useReducedMotion();

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
                <p className={`tabular shrink-0 text-sm font-semibold ${tone}`}>
                  {s.score}
                  <span className="text-[11px] font-normal text-ink-faint">
                    /{s.maxScore}
                  </span>
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-overlay">
                <motion.div
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.06 * i }}
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
