"use client";

import { motion } from "motion/react";
import Panel from "@/components/ui/Panel";
import type { DayActivity } from "@/lib/seed";

export default function ActivityChart({ days }: { days: DayActivity[] }) {
  const max = Math.max(...days.map((d) => d.minutes), 1);
  const total = days.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <Panel
      title="Learning activity"
      subtitle={`${total} minutes in the last 7 days`}
    >
      <div className="flex h-36 items-end gap-2">
        {days.map((d, i) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{
                  height: d.minutes === 0 ? 4 : `${(d.minutes / max) * 100}%`,
                }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.04 * i }}
                title={`${d.minutes} min`}
                className={
                  d.minutes === 0
                    ? "w-full rounded-md bg-bg-overlay"
                    : "w-full rounded-md bg-accent/70 transition-colors hover:bg-accent"
                }
              />
            </div>
            <span className="text-[10px] text-ink-faint">{d.day}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
