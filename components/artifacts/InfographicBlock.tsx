"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Books,
  ChartBar,
  ChartLineUp,
  CheckCircle,
  Clock,
  CurrencyDollar,
  Gear,
  Globe,
  Lightbulb,
  Megaphone,
  Minus,
  Package,
  Rocket,
  Scales,
  ShieldCheck,
  Sparkle,
  Target,
  TrendDown,
  TrendUp,
  Users,
  type IconWeight,
} from "@phosphor-icons/react";
import Markdown from "@/components/artifacts/Markdown";
import type { InfographicBlock as InfographicBlockT } from "@/lib/blocks";

/*
  infographic: a single-scroll visual explainer, presentational only (no
  onCheck), matching the precedent set by graph-diagram and timeline. layout
  picks which one of four hand-built treatments renders:
    stat-row         -> a horizontal band of stat tiles, big tabular numbers
    icon-process     -> an icon-led step strip with connecting chevrons
    comparison-strip -> punchy two-column card comparison (distinct from the
                         prose-based "compare" block: bullets, not paragraphs)
    big-number       -> one hero stat with glow-accent treatment, a pause-and-
                         look moment
  Icon fields on stats/steps are free-form authoring hints (e.g. "growth",
  "clock", "money"); resolveIcon below maps common keywords to a Phosphor
  icon, falling back to a neutral marker, the same keyword-matching approach
  FrameworkCanvasBlock uses to place cells without a rigid lookup table.
*/

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

const LAYOUT_META = {
  "stat-row": { icon: ChartBar, label: "By the numbers" },
  "icon-process": { icon: Gear, label: "How it works" },
  "comparison-strip": { icon: Scales, label: "Side by side" },
  "big-number": { icon: Sparkle, label: "Worth a pause" },
} as const;

const KEYWORD_ICONS: Array<[RegExp, React.ComponentType<{ size?: number; weight?: IconWeight; className?: string }>]> = [
  [/target|goal|aim/i, Target],
  [/user|people|customer|audience/i, Users],
  [/money|cost|revenue|budget|dollar|price/i, CurrencyDollar],
  [/time|clock|speed|hour|day/i, Clock],
  [/check|done|complete|win/i, CheckCircle],
  [/rocket|launch|grow|scale/i, Rocket],
  [/global|world|reach|market/i, Globe],
  [/trust|secure|safe|risk/i, ShieldCheck],
  [/learn|book|research|study/i, Books],
  [/idea|insight|strategy/i, Lightbulb],
  [/campaign|ad|promote|announce/i, Megaphone],
  [/trend|chart|analytic|data/i, ChartLineUp],
  [/package|product|deliver/i, Package],
];

function resolveIcon(hint?: string) {
  if (hint) {
    const match = KEYWORD_ICONS.find(([re]) => re.test(hint));
    if (match) return match[1];
  }
  return Sparkle;
}

const TREND_META = {
  up: { Icon: TrendUp, className: "text-success" },
  down: { Icon: TrendDown, className: "text-danger" },
  flat: { Icon: Minus, className: "text-ink-faint" },
} as const;

export default function InfographicBlock({ block }: { block: InfographicBlockT }) {
  const Meta = LAYOUT_META[block.layout];
  const Icon = Meta.icon;

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-4">
      <p className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
        <Icon size={14} weight="duotone" className="text-accent" /> {Meta.label}
      </p>
      <p className="pb-3 text-sm font-medium text-ink">{block.title}</p>

      {block.layout === "stat-row" && block.stats && <StatRow stats={block.stats} />}
      {block.layout === "icon-process" && block.steps && <IconProcess steps={block.steps} />}
      {block.layout === "comparison-strip" && block.comparison && (
        <ComparisonStrip comparison={block.comparison} />
      )}
      {block.layout === "big-number" && block.bigNumber && (
        <BigNumber bigNumber={block.bigNumber} />
      )}
    </div>
  );
}

/* ---------- stat-row ---------- */

function StatRow({ stats }: { stats: NonNullable<InfographicBlockT["stats"]> }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-wrap gap-3">
      {stats.map((stat, i) => {
        const StatIcon = resolveIcon(stat.icon);
        const trend = stat.trend ? TREND_META[stat.trend] : null;
        return (
          <motion.div
            key={`${stat.label}-${i}`}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.26, ease: EASE, delay: reduce ? 0 : 0.04 * i }}
            className="flex min-w-[140px] flex-1 flex-col gap-2 rounded-xl border border-line bg-bg-raised/50 p-4"
          >
            <div className="flex items-center justify-between">
              <StatIcon size={16} weight="duotone" className="text-accent" />
              {trend && (
                <trend.Icon size={14} weight="bold" className={trend.className} />
              )}
            </div>
            <p className="tabular font-display text-2xl font-semibold text-ink">{stat.value}</p>
            <p className="text-xs leading-snug text-ink-muted">{stat.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ---------- icon-process ---------- */

function IconProcess({ steps }: { steps: NonNullable<InfographicBlockT["steps"]> }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {steps.map((step, i) => {
        const StepIcon = resolveIcon(step.icon);
        return (
          <div key={`${step.title}-${i}`} className="flex items-stretch gap-2">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.26, ease: EASE, delay: reduce ? 0 : 0.05 * i }}
              className="flex w-[168px] flex-col gap-1.5 rounded-xl border border-line bg-bg-raised/50 p-3.5"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft">
                <StepIcon size={16} weight="duotone" className="text-accent" />
              </span>
              <p className="pt-1 text-xs font-medium text-ink">{step.title}</p>
              <p className="text-[11px] leading-relaxed text-ink-muted">{step.detail}</p>
            </motion.div>
            {i < steps.length - 1 && (
              <div className="flex shrink-0 items-center text-ink-faint" aria-hidden>
                <ArrowRight size={14} weight="bold" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- comparison-strip ---------- */

function ComparisonStrip({
  comparison,
}: {
  comparison: NonNullable<InfographicBlockT["comparison"]>;
}) {
  const reduce = useReducedMotion();
  const sides = [
    { side: comparison.left, tone: "accent" as const },
    { side: comparison.right, tone: "neutral" as const },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {sides.map(({ side, tone }, i) => (
        <motion.div
          key={side.label}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.26, ease: EASE, delay: reduce ? 0 : 0.06 * i }}
          className={`flex flex-col gap-2.5 rounded-xl border p-4 ${
            tone === "accent"
              ? "border-accent/30 bg-accent-soft/15"
              : "border-line-strong bg-bg-raised/50"
          }`}
        >
          <p
            className={`text-[11px] font-medium uppercase tracking-wider ${
              tone === "accent" ? "text-accent-bright" : "text-ink-muted"
            }`}
          >
            {side.label}
          </p>
          <ul className="flex flex-col gap-2">
            {side.points.map((point, j) => (
              <li key={j} className="flex items-start gap-2 text-sm leading-snug text-ink">
                <span
                  className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                    tone === "accent" ? "bg-accent" : "bg-ink-faint"
                  }`}
                  aria-hidden
                />
                <span className="min-w-0">{point}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- big-number ---------- */

function BigNumber({ bigNumber }: { bigNumber: NonNullable<InfographicBlockT["bigNumber"]> }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="accent-wash glow-accent relative overflow-hidden rounded-xl border border-accent/40 bg-accent-soft/25 p-6 text-center"
    >
      <p className="relative pb-2 text-[11px] font-medium uppercase tracking-widest text-accent-bright">
        {bigNumber.headline}
      </p>
      <motion.p
        initial={reduce ? false : { scale: 0.85, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.4, ease: EASE, delay: reduce ? 0 : 0.1 }}
        className="tabular relative font-display text-4xl font-semibold text-ink"
      >
        {bigNumber.value}
      </motion.p>
      <div className="relative pt-3 text-left">
        <Markdown text={bigNumber.context} />
      </div>
    </motion.div>
  );
}
