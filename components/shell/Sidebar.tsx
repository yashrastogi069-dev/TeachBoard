"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartLine,
  GearSix,
  GraduationCap,
  Lock,
  SquaresFour,
} from "@phosphor-icons/react";
import { TRACKS } from "@/lib/tracks";

const NAV = [
  { href: "/", label: "Dashboard", icon: SquaresFour, ready: true },
  { href: "/progress", label: "Progress", icon: ChartLine, ready: true },
  { href: "/settings", label: "Settings", icon: GearSix, ready: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-bg-raised/60 md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-line px-5">
        <span
          className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"
          style={{ boxShadow: "0 0 20px -6px var(--accent-glow)" }}
        >
          <GraduationCap size={20} weight="duotone" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-base font-semibold tracking-wide text-ink">
            Praxis
          </p>
          <p className="text-xs text-ink-faint">Your practical professor</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4">
        {NAV.map((item) => {
          const NavIcon = item.icon;
          if (!item.ready) {
            return (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-base text-ink-faint"
                title="Built in a later phase"
              >
                <NavIcon size={18} />
                {item.label}
                <Lock size={13} className="ml-auto" />
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
                  ? "flex items-center gap-3 rounded-lg bg-accent-soft px-3 py-2 text-base font-semibold text-accent-bright"
                  : "row-hover flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-ink active:scale-[0.99]"
              }
            >
              <NavIcon
                size={18}
                weight={active ? "duotone" : "regular"}
                className={active ? "text-accent" : "text-ink-muted"}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pt-2">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-widest text-ink-faint">
          Skill tracks
        </p>
        <div className="flex flex-col gap-1">
          {TRACKS.map((t) => {
            if (!t.active) {
              return (
                <span
                  key={t.slug}
                  data-accent={t.accent}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-base text-ink-muted"
                  title={`${t.tagline}. This course opens after the first two are complete.`}
                >
                  <span className="size-2 shrink-0 rounded-full bg-accent" />
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto shrink-0 whitespace-nowrap rounded-md border border-line px-1.5 py-0.5 text-xs text-ink-muted">
                    Soon
                  </span>
                </span>
              );
            }
            const active = pathname.startsWith(`/tracks/${t.slug}`);
            return (
              <Link
                key={t.slug}
                href={`/tracks/${t.slug}`}
                data-accent={t.accent}
                title={t.tagline}
                className={
                  active
                    ? "flex items-center gap-3 rounded-lg bg-accent-soft px-3 py-2 text-base font-semibold text-accent-bright"
                    : "row-hover flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-ink"
                }
              >
                <span
                  className="size-2 shrink-0 rounded-full bg-accent"
                  style={{ boxShadow: "0 0 8px 0 var(--accent-glow)" }}
                />
                <span className="truncate">{t.title}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <p className="mt-auto px-6 py-4 text-xs text-ink-faint">
        Praxis · learning that ships
      </p>
    </aside>
  );
}
