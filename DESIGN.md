# Praxis design system (DESIGN.md)

Every UI change in this repo follows these rules. They come from four skills
Yash installed (frontend-design, emilkowal-animations, ui-ux-pro-max,
design-taste-frontend) and are locked as policy in AGENTS.md 8d.

## Tokens (app/globals.css)

- Base ramp: `--bg #09090b`, `--bg-raised #101013`, `--bg-overlay #17171b`,
  borders `--border` (7% white) / `--border-strong` (14% white),
  text `--text #ededf0` / `--text-muted #a2a2ad` / `--text-faint #75757f`.
- ONE accent family drives all color: `--accent`, `--accent-bright`,
  `--accent-soft` (14% fill), `--accent-glow` (35% for shadows).
- Track theming: set `data-accent="seo|marketing|analytics|ai|finance"` on any
  wrapper; every descendant that uses accent classes recolors automatically.
  seo=emerald, marketing=electric purple, analytics=amber, ai=cyan,
  finance=deep gold, default=indigo.
- Tailwind utilities from tokens: bg-bg, bg-bg-raised, bg-bg-overlay,
  border-line, border-line-strong, text-ink, text-ink-muted, text-ink-faint,
  bg-accent, text-accent, text-accent-bright, bg-accent-soft, text-success,
  text-warning, text-danger.
- NEVER hardcode hex values in components. Only var()-backed classes.

## Type

- Body: Geist (--font-sans). Display: Space Grotesk via `font-display` class,
  used on h1/h2/panel titles and big numbers. Mono: Geist Mono for source
  chips/code.
- Metric numbers always get the `.tabular` class (tabular-nums).
- Tiny labels: `text-[11px] font-medium uppercase tracking-widest text-ink-faint`.
  Use sparingly (max roughly 1 per panel).

## Motion (Emil Kowalski rules)

- Library: `motion/react` (import { motion, AnimatePresence, useReducedMotion }).
- Standard ease: `cubic-bezier(0.23, 1, 0.32, 1)` -> `const EASE = [0.23, 1, 0.32, 1]`.
- Entrances: opacity 0 + y 8-14px, duration 0.22-0.30s, stagger 40-60ms.
- Data reveals (bars, rings, paths): 0.5-0.8s, same ease.
- Popovers: 0.15s, scale from 0.95, origin-aware (e.g. origin-top-right).
- EVERY animated component calls `useReducedMotion()` and passes
  `initial={reduce ? false : {...}}` (or swaps slide for fade).
- Press feedback: `active:scale-[0.97]` (or 0.98/0.99 for large surfaces).
- Never animate width/height/top/left of layout (transform/opacity only);
  progress-bar width animation on tiny bars is the accepted exception.
- Never `window.addEventListener("scroll")`; use whileInView/useScroll.

## Components and patterns

- Icons: @phosphor-icons/react ONLY. Client components import from
  "@phosphor-icons/react"; SERVER components import from
  "@phosphor-icons/react/dist/ssr". Weight "duotone" for feature/accent icons,
  regular for chrome. No emoji as icons. lucide-react is banned (uninstalled).
- Panel: components/ui/Panel.tsx (title, subtitle, action). Cards:
  rounded-2xl border-line bg-bg-raised/70 p-5; inner cards bg-bg/40 rounded-xl.
- Glow is rationed: resume card, current skill-map node, sidebar logo,
  copilot button. Do not add glow to new elements without removing one.
- Focus: global `:focus-visible` accent outline exists; never suppress it.
- Empty/loading/error states are mandatory on every data panel; errors show
  the EXACT message (failure-visibility rule), never a generic "oops".
- Buttons: primary = bg-accent-soft text-accent-bright rounded-xl; keep one
  primary action per view; labels say what happens ("Complete lesson").
- Copy rules: plain sentences, no em dashes anywhere, no filler verbs
  ("elevate", "unleash"), no fake numbers; sample data must be labeled.

## Layout

- Dashboard grid: full-width rows for skill map and system health; 2-col and
  3-col rows otherwise; `max-w-6xl mx-auto` (content pages `max-w-3xl/4xl`).
- Wrap protection: chips get `shrink-0 whitespace-nowrap`; flexible text gets
  `min-w-0 truncate`; chip rows that can overflow get `flex-wrap`.
- Mobile: multi-column grids collapse to single column (grid-cols-1 default);
  the sidebar is hidden below md (mobile nav is an accepted gap for now).
