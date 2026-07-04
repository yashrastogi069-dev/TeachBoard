import {
  ArrowCircleRight,
  ArrowCounterClockwise,
  PlayCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import Panel from "@/components/ui/Panel";
import { getTrack } from "@/lib/tracks";
import type { Recommendation } from "@/lib/seed";

const KIND_META: Record<Recommendation["kind"], { icon: Icon; label: string }> = {
  revision: { icon: ArrowCounterClockwise, label: "Revise" },
  next_module: { icon: ArrowCircleRight, label: "Next up" },
  resource: { icon: PlayCircle, label: "Resource" },
};

export default function Recommendations({ items }: { items: Recommendation[] }) {
  return (
    <Panel
      title="Professor's recommendations"
      subtitle="Generated from your rubric gaps and pace, refreshed after every graded test."
    >
      <ul className="flex flex-col gap-2">
        {items.map((rec) => {
          const track = getTrack(rec.trackSlug);
          const meta = KIND_META[rec.kind];
          const KindIcon = meta.icon;
          return (
            <li
              key={rec.id}
              data-accent={track?.accent}
              className="flex items-start gap-3 rounded-xl border border-line bg-bg/40 p-3"
            >
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
                <KindIcon size={14} weight="duotone" />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-[11px] font-medium uppercase tracking-wider text-accent-bright">
                  {meta.label} · {track?.title}
                </p>
                <p className="pt-1 text-xs text-ink-muted">{rec.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
