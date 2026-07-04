"use client";

import { motion, useReducedMotion } from "motion/react";
import Panel from "@/components/ui/Panel";
import { getTrack } from "@/lib/tracks";
import type { JobGoal } from "@/lib/seed";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function JobGoals({ goals }: { goals: JobGoal[] }) {
  const reduce = useReducedMotion();

  return (
    <Panel
      title="Skill goals · job roles"
      subtitle="Readiness for the roles you are targeting, weighted from linked track mastery."
    >
      <ul className="flex flex-col gap-4">
        {goals.map((goal, i) => (
          <li key={goal.id} className="leading-tight">
            <div className="flex items-baseline justify-between pb-1.5">
              <p className="text-xs font-medium text-ink">{goal.role}</p>
              <p className="tabular text-sm font-semibold text-ink">
                {goal.readiness}
                <span className="text-[11px] font-normal text-ink-faint">
                  % ready
                </span>
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-overlay">
              <motion.div
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${goal.readiness}%` }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.06 * i }}
                className="h-full rounded-full bg-accent"
              />
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1.5 text-[11px] text-ink-faint">
              built from
              {goal.linkedTrackSlugs.map((slug) => {
                const track = getTrack(slug);
                return (
                  <span
                    key={slug}
                    data-accent={track?.accent}
                    className="flex shrink-0 items-center gap-1 whitespace-nowrap"
                    title={track?.title}
                  >
                    <span className="size-1.5 rounded-full bg-accent" />
                    {track?.title}
                  </span>
                );
              })}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
