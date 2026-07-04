"use client";

import { motion, useReducedMotion } from "motion/react";
import Panel from "@/components/ui/Panel";
import type { DayActivity } from "@/lib/seed";

/*
  Smooth flowing area chart, hand-rolled SVG (no chart library needed for
  7 points). The curve is a Catmull-Rom spline converted to cubic beziers.
  Dots are positioned as HTML so they stay perfectly round while the SVG
  stretches to the container.
*/

const W = 100;
const H = 40;
const TOP = 6;
const BOTTOM = 36;

type Pt = [number, number];

function toPoints(days: DayActivity[], max: number): Pt[] {
  return days.map((d, i) => [
    days.length === 1 ? 0 : (i / (days.length - 1)) * W,
    BOTTOM - (d.minutes / max) * (BOTTOM - TOP),
  ]);
}

function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export default function ActivityChart({ days }: { days: DayActivity[] }) {
  const reduce = useReducedMotion();
  const max = Math.max(...days.map((d) => d.minutes), 1);
  const total = days.reduce((sum, d) => sum + d.minutes, 0);
  const pts = toPoints(days, max);
  const line = smoothPath(pts);
  const area = `${line} L ${W},${BOTTOM} L 0,${BOTTOM} Z`;

  return (
    <Panel
      title="Learning activity"
      subtitle={`${total} minutes in the last 7 days`}
    >
      <div className="relative h-28">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={area}
            fill="url(#activity-fill)"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke="var(--accent-bright)"
            strokeWidth={1.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          />
        </svg>
        {pts.map(([x, y], i) => (
          <span
            key={days[i].day}
            title={`${days[i].day}: ${days[i].minutes} min`}
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-bright"
            style={{
              left: `${x}%`,
              top: `${(y / H) * 100}%`,
              boxShadow:
                days[i].minutes === max
                  ? "0 0 12px 2px var(--accent-glow)"
                  : "0 0 6px 0 var(--accent-glow)",
            }}
          />
        ))}
      </div>
      <div className="flex justify-between pt-2">
        {days.map((d) => (
          <span key={d.day} className="text-[10px] text-ink-faint">
            {d.day}
          </span>
        ))}
      </div>
    </Panel>
  );
}
