"use client";

import { motion, useReducedMotion } from "motion/react";
import { PlayCircle } from "@phosphor-icons/react";
import { getTrack } from "@/lib/tracks";
import type { ResumePoint } from "@/lib/seed";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function ResumeCard({ resume }: { resume: ResumePoint }) {
  const reduce = useReducedMotion();
  const track = getTrack(resume.trackSlug);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      data-accent={track?.accent}
      className="relative overflow-hidden rounded-2xl border border-accent/25 bg-bg-raised/70 p-5"
      style={{ boxShadow: "0 0 48px -18px var(--accent-glow)" }}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--accent-glow)" }}
      />
      <p className="text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        Continue where you left off
      </p>
      <p className="pt-2 text-xs text-accent-bright">{track?.title}</p>
      <h3 className="font-display pt-1 text-lg font-semibold text-ink">
        {resume.lessonTitle}
      </h3>
      <p className="pt-0.5 text-xs text-ink-muted">Module: {resume.moduleTitle}</p>

      <div className="flex items-center gap-4 pt-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-overlay">
          <motion.div
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${resume.progressPct}%` }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
            className="h-full rounded-full bg-accent"
          />
        </div>
        <span className="tabular text-xs text-ink-muted">
          {resume.progressPct}%
        </span>
        <span
          className="flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-accent-soft px-3 py-2 text-xs font-medium text-accent-bright"
          title="The lesson player is built in Phase 1"
        >
          <PlayCircle size={16} weight="duotone" />
          Resume lesson
        </span>
      </div>
    </motion.div>
  );
}
