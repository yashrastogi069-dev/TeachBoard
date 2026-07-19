import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Small duotone Phosphor icon node shown in a colored chip beside the title. */
  icon?: ReactNode;
  /** Text-color class for the chip (drives both icon and tint via currentColor). */
  iconColor?: string;
  children: ReactNode;
  className?: string;
}

export default function Panel({
  title,
  subtitle,
  action,
  icon,
  iconColor,
  children,
  className,
}: PanelProps) {
  return (
    <section
      className={`card-hover rounded-2xl border border-line bg-bg-raised/70 p-5 ${className ?? ""}`}
    >
      <header className="flex items-start justify-between gap-3 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span className={`chip-icon ${iconColor ?? "text-accent"}`}>{icon}</span>
          )}
          <div className="min-w-0 leading-tight">
            <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
            {subtitle && <p className="pt-1 text-xs text-ink-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
