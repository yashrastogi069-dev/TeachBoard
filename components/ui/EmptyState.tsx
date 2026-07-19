import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";

/*
  Shared empty-state block for dashboard panels: a large duotone Phosphor icon
  at ~40% accent opacity above readable muted copy. Works in both server and
  client panels (the Icon component reference is passed in by the caller).
*/
export default function EmptyState({
  icon: IconEl,
  children,
}: {
  icon: Icon;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-bg/40 p-6 text-center">
      <IconEl size={40} weight="duotone" className="text-accent opacity-40" />
      <p className="max-w-xs text-sm leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}
