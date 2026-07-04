import {
  ArrowsClockwise,
  BookOpen,
  CheckCircle,
  Circle,
  Exam,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import Panel from "@/components/ui/Panel";
import { getTrack } from "@/lib/tracks";
import type { PlanItem, PlanKind } from "@/lib/seed";

const KIND_ICON: Record<PlanKind, Icon> = {
  lesson: BookOpen,
  assessment: Exam,
  review: ArrowsClockwise,
};

const KIND_LABEL: Record<PlanKind, string> = {
  lesson: "Lesson",
  assessment: "Practical test",
  review: "Review",
};

export default function TodayPlan({ items }: { items: PlanItem[] }) {
  const doneCount = items.filter((i) => i.done).length;

  return (
    <Panel
      title="Today's plan"
      subtitle={`${doneCount} of ${items.length} done. Built from your deadlines and weakest rubric criteria.`}
    >
      {items.length === 0 && (
        <p className="rounded-xl border border-line bg-bg/40 p-4 text-xs leading-relaxed text-ink-faint">
          Nothing scheduled yet. Open a track, finish a lesson, and your plan
          builds itself from deadlines and weak spots.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const track = getTrack(item.trackSlug);
          const KindIcon = KIND_ICON[item.kind];
          return (
            <li
              key={item.id}
              data-accent={track?.accent}
              className="flex items-start gap-3 rounded-xl border border-line bg-bg/40 p-3"
            >
              {item.done ? (
                <CheckCircle
                  size={16}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-success"
                />
              ) : (
                <Circle size={16} className="mt-0.5 shrink-0 text-ink-faint" />
              )}
              <div className="min-w-0 leading-tight">
                <p
                  className={
                    item.done
                      ? "text-xs text-ink-faint line-through"
                      : "text-xs text-ink"
                  }
                >
                  {item.label}
                </p>
                <p className="flex items-center gap-1.5 pt-1 text-[11px] text-ink-faint">
                  <KindIcon size={12} weight="duotone" className="text-accent" />
                  {KIND_LABEL[item.kind]} · {track?.title} · ~{item.estMinutes} min
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
