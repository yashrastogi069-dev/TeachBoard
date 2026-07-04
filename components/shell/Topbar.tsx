"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CaretDown, Fire, Gauge } from "@phosphor-icons/react";
import type { TrackMastery } from "@/lib/seed";
import { getTrack } from "@/lib/tracks";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export interface TopStats {
  streakDays: number;
  overallMastery: number;
  trackMastery: Array<{ trackSlug: string; mastery: number }>;
}

function titleFor(pathname: string): { title: string; subtitle: string } {
  if (pathname === "/") return { title: "Dashboard", subtitle: "All tracks, one view" };
  if (pathname.startsWith("/tracks/")) {
    const slug = pathname.split("/")[2];
    const track = getTrack(slug);
    return {
      title: track?.title ?? "Track",
      subtitle: pathname.split("/").length > 3 ? "Learning" : "Module path",
    };
  }
  if (pathname.startsWith("/assess")) return { title: "Practical test", subtitle: "Graded on a strict rubric" };
  if (pathname.startsWith("/progress")) return { title: "Progress", subtitle: "The long view" };
  if (pathname.startsWith("/settings")) return { title: "Settings", subtitle: "Praxis setup" };
  return { title: "Praxis", subtitle: "" };
}

export default function Topbar({ stats }: { stats: TopStats }) {
  const [statsOpen, setStatsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const heading = titleFor(pathname);

  useEffect(() => {
    if (!statsOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setStatsOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [statsOpen]);

  const trackMasteryFull: TrackMastery[] = stats.trackMastery.flatMap((tm) => {
    const track = getTrack(tm.trackSlug);
    return track ? [{ track, mastery: tm.mastery, modulesDone: 0, modulesTotal: 0 }] : [];
  });

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-bg/80 px-6 backdrop-blur">
      <div className="leading-tight">
        <p className="font-display text-sm font-semibold text-ink">{heading.title}</p>
        {heading.subtitle && (
          <p className="text-[11px] text-ink-faint">{heading.subtitle}</p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span
          className="flex items-center gap-1.5 rounded-full border border-line bg-bg-raised px-3 py-1.5 text-xs text-ink-muted"
          title="Days in a row with learning activity"
        >
          <Fire size={14} weight="duotone" className="text-warning" />
          <span className="tabular font-medium text-ink">
            {stats.streakDays} day streak
          </span>
        </span>

        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setStatsOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-bg-raised px-3 py-1.5 text-xs text-ink-muted transition-colors duration-150 hover:border-line-strong hover:text-ink active:scale-[0.97]"
          >
            <Gauge size={14} weight="duotone" className="text-accent" />
            <span className="tabular font-medium text-ink">
              {stats.overallMastery}% mastery
            </span>
            <CaretDown
              size={14}
              className={`transition-transform duration-150 ${statsOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {statsOpen && (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.95 }}
                transition={{ duration: 0.15, ease: EASE }}
                className="absolute right-0 top-11 w-72 origin-top-right rounded-xl border border-line bg-bg-overlay p-4 shadow-2xl shadow-black/50"
              >
                <p className="pb-3 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
                  Mastery by track
                </p>
                <div className="flex flex-col gap-3">
                  {trackMasteryFull.map(({ track, mastery }) => (
                    <div key={track.slug} data-accent={track.accent}>
                      <div className="flex items-baseline justify-between pb-1">
                        <span className="text-xs text-ink-muted">{track.title}</span>
                        <span className="tabular text-xs font-medium text-ink">
                          {mastery}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-bg-raised">
                        <motion.div
                          initial={reduce ? false : { width: 0 }}
                          animate={{ width: `${mastery}%` }}
                          transition={{ duration: 0.5, ease: EASE }}
                          className="h-full rounded-full bg-accent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="pt-3 text-[11px] text-ink-faint">
                  This popover keeps global progress one click away from any page,
                  however deep you are inside a track.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-bright">
          Y
        </span>
      </div>
    </header>
  );
}
