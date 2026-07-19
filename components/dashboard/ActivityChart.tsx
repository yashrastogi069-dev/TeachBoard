"use client";

import { motion, useReducedMotion } from "motion/react";
import { ChartBar, Fire } from "@phosphor-icons/react";
import Panel from "@/components/ui/Panel";
import type { DayActivity } from "@/lib/seed";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function ActivityChart({
  days,
  streakDays,
}: {
  days: DayActivity[];
  streakDays: number;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(...days.map((d) => d.minutes), 1);
  const total = days.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <Panel
      title="Learning activity"
      subtitle={`${total} minutes in the last 7 days`}
      icon={<ChartBar size={18} weight="duotone" />}
      iconColor="text-accent"
      action={
        <div className="flex items-center gap-2.5">
          <span className="chip-icon text-warning">
            <Fire size={18} weight="duotone" />
          </span>
          <div className="leading-none">
            <span className="tabular font-display text-3xl font-semibold text-warning">
              {streakDays}
            </span>
            <p className="pt-0.5 text-[11px] text-ink-muted">day streak</p>
          </div>
        </div>
      }
    >
      <div className="flex h-28 items-end justify-between gap-2">
        {days.map((d, i) => {
          const isToday = i === days.length - 1;
          const heightPct =
            d.minutes > 0 ? Math.max((d.minutes / max) * 100, 8) : 3;
          return (
            <div
              key={`${d.day}-${i}`}
              className="flex h-full flex-1 flex-col justify-end"
              title={`${d.day}: ${d.minutes} min`}
            >
              <motion.div
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.05 * i }}
                style={{
                  height: `${heightPct}%`,
                  transformOrigin: "bottom",
                  boxShadow: isToday
                    ? "0 0 14px -2px var(--accent-glow)"
                    : undefined,
                }}
                className={`w-full rounded-md ${
                  isToday
                    ? "bg-accent"
                    : d.minutes > 0
                      ? "bg-accent/35"
                      : "bg-line-strong"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between pt-2">
        {days.map((d, i) => (
          <span
            key={`${d.day}-label-${i}`}
            className={`flex-1 text-center text-[10px] ${
              i === days.length - 1 ? "font-medium text-accent-bright" : "text-ink-faint"
            }`}
          >
            {d.day}
          </span>
        ))}
      </div>
    </Panel>
  );
}
