"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Sparkle } from "@phosphor-icons/react";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

const STAGES = [
  "Researching current best practice...",
  "Designing your module path...",
  "Writing real-world assessments and rubrics...",
  "Saving your course...",
];

/*
  One-time course builder for a track. Calls /api/curriculum, which
  researches the topic and generates modules, lessons, and assessments,
  then refreshes the page to show the module path.
*/
export default function GenerateCurriculum({ trackSlug }: { trackSlug: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      9000
    );
    return () => clearInterval(timer);
  }, [busy]);

  async function generate() {
    setBusy(true);
    setError(null);
    setStage(0);
    try {
      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackSlug }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? `Generation failed with status ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Curriculum generation failed");
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="rounded-2xl border border-accent/25 bg-bg-raised/70 p-8 text-center"
      style={{ boxShadow: "0 0 48px -18px var(--accent-glow)" }}
    >
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Sparkle size={24} weight="duotone" />
      </span>
      <h2 className="font-display pt-4 text-lg font-semibold text-ink">
        This course has not been built yet
      </h2>
      <p className="mx-auto max-w-md pt-2 text-sm text-ink-muted">
        The professor will research current best practice, design the module
        path from zero to job-ready, and write real-world assessments with
        strict rubrics. This runs once and takes about a minute.
      </p>

      {error && (
        <p className="mx-auto mt-4 max-w-md rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="mt-6 rounded-xl bg-accent-soft px-6 py-3 text-sm font-medium text-accent-bright transition-transform duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed"
      >
        {busy ? STAGES[stage] : "Build my course"}
      </button>
      {busy && (
        <div className="mx-auto mt-4 h-1 max-w-xs overflow-hidden rounded-full bg-bg-overlay">
          <motion.div
            initial={{ width: "5%" }}
            animate={{ width: ["5%", "90%"] }}
            transition={{ duration: 45, ease: "easeOut" }}
            className="h-full rounded-full bg-accent"
          />
        </div>
      )}
    </motion.div>
  );
}
