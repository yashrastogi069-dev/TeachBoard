"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  LineChart,
  Lock,
  Settings,
} from "lucide-react";
import { TRACKS } from "@/lib/tracks";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/progress", label: "Progress", icon: LineChart, ready: false },
  { href: "/settings", label: "Settings", icon: Settings, ready: false },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-bg-raised/60 md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-line px-5">
        <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
          <GraduationCap className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-wide text-ink">Praxis</p>
          <p className="text-[11px] text-ink-faint">Your practical professor</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          if (!item.ready) {
            return (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-faint"
                title="Built in a later phase"
              >
                <Icon className="size-4" />
                {item.label}
                <Lock className="ml-auto size-3" />
              </span>
            );
          }
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-3 rounded-lg bg-accent-soft px-3 py-2 text-sm font-medium text-accent-bright"
                  : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-bg-overlay hover:text-ink"
              }
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pt-2">
        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
          Skill tracks
        </p>
        <div className="flex flex-col gap-1">
          {TRACKS.map((t) => (
            <span
              key={t.slug}
              data-accent={t.accent}
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted"
              title={`${t.tagline}. Opens in Phase 1.`}
            >
              <span className="size-2 rounded-full bg-accent" />
              <span className="truncate">{t.title}</span>
              <span className="ml-auto rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">
                Phase 1
              </span>
            </span>
          ))}
        </div>
      </div>

      <p className="mt-auto px-6 py-4 text-[11px] text-ink-faint">
        Phase 0 preview build
      </p>
    </aside>
  );
}
