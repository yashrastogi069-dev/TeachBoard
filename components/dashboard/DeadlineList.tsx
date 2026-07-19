import { CalendarBlank, CalendarX } from "@phosphor-icons/react/dist/ssr";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import { getTrack } from "@/lib/tracks";
import type { Deadline } from "@/lib/seed";

function StatusChip({ deadline }: { deadline: Deadline }) {
  if (deadline.status === "missed") {
    return (
      <span className="rounded-md bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
        missed
      </span>
    );
  }
  if (deadline.status === "met") {
    return (
      <span className="rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
        done
      </span>
    );
  }
  const urgent = deadline.daysLeft <= 3;
  return (
    <span
      className={
        urgent
          ? "rounded-md bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning"
          : "rounded-md bg-bg-overlay px-2 py-0.5 text-[11px] font-medium text-ink-muted"
      }
    >
      {deadline.daysLeft}d left
    </span>
  );
}

export default function DeadlineList({ items }: { items: Deadline[] }) {
  return (
    <Panel
      title="Deadlines"
      subtitle="Missed ones trigger an ntfy push and a rescue plan."
      icon={<CalendarX size={18} weight="duotone" />}
      iconColor="text-danger"
    >
      {items.length === 0 && (
        <EmptyState icon={CalendarBlank}>
          No deadlines yet. Starting a module sets one automatically, one week out.
        </EmptyState>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((d) => {
          const track = getTrack(d.trackSlug);
          return (
            <li
              key={d.id}
              data-accent={track?.accent}
              className="row-hover flex items-start gap-3 rounded-xl border border-line bg-bg/40 p-3"
            >
              <CalendarBlank
                size={16}
                weight="duotone"
                className="mt-0.5 shrink-0 text-danger"
              />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-xs text-ink">{d.title}</p>
                <p className="pt-1 text-[11px] text-ink-muted">
                  {track?.title} · due {d.dueLabel}
                </p>
              </div>
              <StatusChip deadline={d} />
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
