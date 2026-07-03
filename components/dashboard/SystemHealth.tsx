"use client";

import { motion } from "motion/react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import Panel from "@/components/ui/Panel";
import type { QuotaUsage, SystemEvent } from "@/lib/seed";

function quotaTone(pct: number): string {
  if (pct >= 85) return "bg-danger";
  if (pct >= 60) return "bg-warning";
  return "bg-success";
}

const SEVERITY_META: Record<
  SystemEvent["severity"],
  { icon: typeof Info; tone: string }
> = {
  error: { icon: AlertCircle, tone: "text-danger" },
  warning: { icon: AlertTriangle, tone: "text-warning" },
  info: { icon: Info, tone: "text-ink-faint" },
};

export default function SystemHealth({
  quotas,
  events,
}: {
  quotas: QuotaUsage[];
  events: SystemEvent[];
}) {
  return (
    <Panel
      title="System health"
      subtitle="Free-tier quota usage and recent events. Errors also push to your phone via ntfy."
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          {quotas.map((q, i) => {
            const pct = Math.min(100, Math.round((q.used / q.limit) * 100));
            return (
              <div key={q.provider} className="leading-tight">
                <div className="flex items-baseline justify-between pb-1">
                  <span className="text-xs text-ink-muted">{q.provider}</span>
                  <span className="text-[11px] text-ink-faint">
                    {q.used.toLocaleString()} / {q.limit.toLocaleString()} {q.unit} per{" "}
                    {q.period}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-overlay">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.06 * i }}
                    className={`h-full rounded-full ${quotaTone(pct)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-line pt-4">
          <p className="pb-2 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
            Recent events
          </p>
          <ul className="flex flex-col gap-2">
            {events.map((evt) => {
              const meta = SEVERITY_META[evt.severity];
              const Icon = meta.icon;
              return (
                <li
                  key={evt.id}
                  className="flex items-start gap-2.5 rounded-xl border border-line bg-bg/40 p-3"
                >
                  <Icon className={`mt-0.5 size-4 shrink-0 ${meta.tone}`} />
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
