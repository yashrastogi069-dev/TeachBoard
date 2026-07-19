"use client";

import { motion, useReducedMotion } from "motion/react";

interface ProgressRingProps {
  value: number; // 0..100
  size?: number;
  strokeWidth?: number;
}

export default function ProgressRing({
  value,
  size = 72,
  strokeWidth = 7,
}: ProgressRingProps) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = circumference * (1 - clamped / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--accent) 12%, transparent)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: target }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        />
      </svg>
      <span className="tabular absolute inset-0 grid place-items-center text-sm font-semibold text-accent-bright">
        {clamped}%
      </span>
    </div>
  );
}
