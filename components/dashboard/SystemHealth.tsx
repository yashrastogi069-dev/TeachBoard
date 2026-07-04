"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  Coins,
  Info,
  PlugsConnected,
  Warning,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import Panel from "@/components/ui/Panel";
import type { AiUsage, DataSource, QuotaUsage, SystemEvent } from "@/lib/seed";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

function quotaTone(pct: number): string {
  if (pct >= 85) return "bg-danger";
  if (pct >= 60) return "bg-warning";
  return "bg-success";
}

const SEVERITY_META: Record<SystemEvent["severity"], { icon: Icon; tone: string }> = {
  error: { icon: WarningCircle, tone: "text-danger" },
  warning: { icon: Warning, tone: "text-warning" },
  info: { icon: Info, tone: "text-ink-faint" },
};

export default function SystemHealth({
  quotas,
  events,
  aiUsage,
  dataSources,
}: {
  quotas: QuotaUsage[];
  events: SystemEvent[];
  aiUsage: AiUsage;
  dataSources: DataSource[];
}) {
  const reduce = useReducedMotion();

  return (
    <Panel
      title="System health"
      subtitle="Quota usage, AI cost, connected sources, and recent events. Errors also push to your phone via ntfy."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-ink-faint">
            Free-tier quotas
          </p>
          {quotas.map((q, i) => {
            const pct = Math.min(100, Math.round((q.used / q.limit) * 100));
            return (
              <div key={q.provider} className="leading-tight">
                <div className="flex items-baseline justify-between pb-1">
                  <span className="text-xs text-ink-muted">{q.provider}</span>
                  <span className="tabular text-[11px] text-ink-faint">
                    {q.used.toLocaleString()} / {q.limit.toLocaleString()} {q.unit}{" "}
                    per {q.period}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-overlay">
                  <motion.div
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.05 * i }}
                    className={`h-full rounded-full ${quotaTone(pct)}`}
                  />
                </div>
              </div>
            );
          })}
          <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-line bg-bg/40 p-3">
            <Coins size={16} weight="duotone" className="shrink-0 text-warning" />
            <p className="text-[11px] leading-relaxed text-ink-muted">
              AI usage today:{" "}
              <span className="tabular font-medium text-ink">
                {aiUsage.callsToday} calls · {(aiUsage.tokensToday / 1000).toFixed(1)}k
                tokens
              </span>{" "}
              · est. cost{" "}
              <span className="tabular font-medium text-success">
                ${aiUsage.estCostUsd.toFixed(2)}
              </span>{" "}
              (free tier)
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="pb-1 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
            Data sources
          </p>
          {dataSources.map((src) => (
            <div
              key={src.id}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-bg/40 px-3 py-2"
            >
              <PlugsConnected
                size={14}
                className={
                  src.status === "connected"
                    ? "shrink-0 text-success"
                    : "shrink-0 text-ink-faint"
                }
              />
              <span className="shrink-0 text-xs text-ink">{src.name}</span>
              <span className="min-w-0 truncate text-[10px] text-ink-faint">
                {src.detail}
              </span>
              <span
                className={
                  src.status === "connected"
                    ? "ml-auto shrink-0 whitespace-nowrap rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success"
                    : "ml-auto shrink-0 whitespace-nowrap rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning"
                }
              >
                {src.status === "connected" ? "connected" : "awaiting key"}
              </span>
            </div>
          ))}
        </div>

        <div>
          <p className="pb-2 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
            Recent events
          </p>
          <ul className="flex flex-col gap-2">
            {events.map((evt) => {
              const meta = SEVERITY_META[evt.severity];
              const SeverityIcon = meta.icon;
              return (
                <li
                  key={evt.id}
                  className="flex items-start gap-2.5 rounded-xl border border-line bg-bg/40 p-3"
                >
                  <SeverityIcon size={16} className={`mt-0.5 shrink-0 ${meta.tone}`} />
                  <div className="min-w-0 leading-tight">
                    <p className="flex items-center gap-2 pb-1">
                      <span className="rounded bg-bg-overlay px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                        {evt.source}
                      </span>
                      <span className="text-[11px] text-ink-faint">
                        {evt.occurredLabel}
                      </span>
                    </p>
                    <p className="text-xs text-ink-muted">{evt.message}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
