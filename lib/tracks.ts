/*
  Canonical list of skill tracks. The `accent` value maps to the
  [data-accent] selectors in app/globals.css; setting it on a layout
  wrapper recolors every component underneath it.
  In Phase 1 this list seeds the `skill_tracks` table and the DB becomes
  the source of truth; the type stays the shared contract.
*/

export type TrackAccent = "ai" | "marketing" | "seo" | "analytics" | "finance";

export interface Track {
  slug: string;
  title: string;
  tagline: string;
  accent: TrackAccent;
  active: boolean; // active tracks have generated courses; others come later
}

export const TRACKS: Track[] = [
  {
    slug: "seo-geo",
    title: "SEO / GEO",
    tagline: "Rank in search engines and AI answer engines",
    accent: "seo",
    active: true,
  },
  {
    slug: "digital-marketing",
    title: "Digital Marketing",
    tagline: "Campaigns, funnels, paid and organic growth",
    accent: "marketing",
    active: true,
  },
  {
    slug: "analytics",
    title: "GA4 & Search Console",
    tagline: "Measure, audit and report like an analyst",
    accent: "analytics",
    active: false,
  },
  {
    slug: "ai-automation",
    title: "AI Automation",
    tagline: "Agents, workflows and n8n in real businesses",
    accent: "ai",
    active: false,
  },
  {
    slug: "finance",
    title: "Finance",
    tagline: "Read numbers, build budgets, defend decisions",
    accent: "finance",
    active: false,
  },
];

export function getTrack(slug: string): Track | undefined {
  return TRACKS.find((t) => t.slug === slug);
}
