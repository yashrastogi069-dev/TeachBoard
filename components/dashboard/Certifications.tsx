"use client";

import { motion, useReducedMotion } from "motion/react";
import { Hourglass, Medal } from "@phosphor-icons/react";
import Panel from "@/components/ui/Panel";
import type { Certification } from "@/lib/seed";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function Certifications({ items }: { items: Certification[] }) {
  const reduce = useReducedMotion();

  return (
    <Panel
      title="Certifications"
      subtitle="External certificates your tracks prepare you for. Earned badges will appear here."
    >
      {items.length === 0 && (
        <p className="rounded-xl border border-line bg-bg/40 p-4 text-xs leading-relaxed text-ink-faint">
          All planned certifications are earned, or none are set up yet.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((cert, i) => (
          <li
            key={cert.id}
            className="flex items-start gap-3 rounded-xl border border-line bg-bg/40 p-3"
          >
            <span
              className={
                cert.status === "in_progress"
                  ? "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"
                  : "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-bg-overlay text-ink-faint"
              }
            >
              {cert.status === "in_progress" ? (
                <Hourglass size={16} weight="duotone" />
              ) : (
                <Medal size={16} weight="duotone" />
              )}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-ink">{cert.name}</p>
                {cert.status === "in_progress" && (
                  <span className="tabular shrink-0 text-[11px] font-medium text-accent-bright">
                    {cert.progressPct}%
                  </span>
                )}
              </div>
              <p className="pt-0.5 text-[11px] text-ink-faint">
                {cert.provider} ·{" "}
                {cert.status === "in_progress" ? "in progress" : "planned"}
              </p>
              {cert.status === "in_progress" && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-bg-overlay">
                  <motion.div
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${cert.progressPct}%` }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.06 * i }}
                    className="h-full rounded-full bg-accent"
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
