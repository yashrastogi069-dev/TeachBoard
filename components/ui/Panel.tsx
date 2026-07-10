import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Panel({ title, subtitle, action, children, className }: PanelProps) {
  return (
    <section
      className={`rounded-2xl border border-line bg-bg-raised/70 p-5 transition-colors duration-200 hover:border-line-strong ${className ?? ""}`}
    >
      <header className="flex items-start justify-between gap-3 pb-4">
        <div className="leading-tight">
          <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
          {subtitle && <p className="pt-1 text-xs text-ink-faint">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
