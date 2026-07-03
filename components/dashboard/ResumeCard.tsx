"use client";

import { motion } from "motion/react";
import { PlayCircle } from "lucide-react";
import { getTrack } from "@/lib/tracks";
import type { ResumePoint } from "@/lib/seed";

export default function ResumeCard({ resume }: { resume: ResumePoint }) {
  const track = getTrack(resume.trackSlug);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      data-accent={track?.accent}
      className="relative overflow-hidden rounded-2xl border border-line bg-bg-raised/70 p-5"
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--accent-glow)" }}
      />
      <p className="text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        Continue where you left off
      </p>
      <p className="pt-2 text-xs text-accent-bright">{track?.title}</p>
      <h3 className="pt-1 text-lg font-semibold text-ink">{resume.lessonTitle}</h3>
      <p className="pt-0.5 text-xs text-ink-muted">Module: {resume.moduleTitle}</p>

      <div className="flex items-center gap-4 pt-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-overlay">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${resume.progressPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="h-full rounded-full bg-accent"
          />
        </div>
        <span className="text-xs text-ink-muted">{resume.progressPct}%</span>
        <span
          className="flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-accent-soft px-3 py-2 text-xs font-medium text-accent-bright"
          title="The lesson player is built in Phase 1"
        >
          <PlayCircle className="size-4" />
          Resume lesson
        </span>
      </div>
    </motion.div>
  );
}
