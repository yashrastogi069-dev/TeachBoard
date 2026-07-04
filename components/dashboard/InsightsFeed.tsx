import { Newspaper } from "@phosphor-icons/react/dist/ssr";
import Panel from "@/components/ui/Panel";
import { getTrack } from "@/lib/tracks";
import type { InsightItem } from "@/lib/seed";

export default function InsightsFeed({ items }: { items: InsightItem[] }) {
  return (
    <Panel
      title="Expert insights feed"
      subtitle="Fresh industry news matched to your tracks, refreshed by the nightly research run."
    >
      {items.length === 0 && (
        <p className="rounded-xl border border-line bg-bg/40 p-4 text-xs leading-relaxed text-ink-faint">
          No news pulled yet. The nightly n8n refresh (or hitting the refresh
          cron route once) fills this feed.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const track = getTrack(item.trackSlug);
          return (
            <li
              key={item.id}
              data-accent={track?.accent}
              className="flex items-start gap-3 rounded-xl border border-line bg-bg/40 p-3"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <Newspaper size={16} weight="duotone" />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-xs text-ink">{item.title}</p>
                <p className="pt-1 text-[11px] text-ink-faint">
                  {item.source} · {item.ageLabel} · {track?.title}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
