# Praxis design system (DESIGN.md)

Every UI change in this repo follows these rules. They come from four skills
Yash installed (frontend-design, emilkowal-animations, ui-ux-pro-max,
design-taste-frontend) and are locked as policy in AGENTS.md 8d.

## Tokens (app/globals.css)

- Surface ladder (deepest -> highest), faint cool-violet tint so elevation
  reads as depth not just lighter gray: `--bg-inset #060507`, `--bg #09090b`,
  `--bg-raised #111014`, `--bg-overlay #191820`, `--bg-elevated #221f2b`.
  Borders `--border` (7% white) / `--border-strong` (14% white). Text
  `--text #f2f2f5` / `--text-muted #b0b0bc` / `--text-faint #7c7c88`
  (contrast bumped for the larger, more readable type).
- ONE accent family drives all color: `--accent`, `--accent-bright` (brightened
  a step), `--accent-soft` (~15-16% fill), `--accent-glow` (42% for shadows).
- Status colors are first-class tokens with soft fills: `--success` +
  `--success-soft`, `--warning` + `--warning-soft`, `--danger` + `--danger-soft`
  (utilities `bg-success-soft` etc, plus the existing `bg-success/10` opacity
  form). Use them for status states, not just red/green text.
- Track theming: set `data-accent="seo|marketing|analytics|ai|finance"` on any
  wrapper; every descendant that uses accent classes recolors automatically.
  seo=emerald, marketing=electric purple, analytics=amber, ai=cyan,
  finance=deep gold, default=indigo.
- Tailwind utilities from tokens: bg-bg-inset, bg-bg, bg-bg-raised,
  bg-bg-overlay, bg-bg-elevated, border-line, border-line-strong, text-ink,
  text-ink-muted, text-ink-faint, bg-accent, text-accent, text-accent-bright,
  bg-accent-soft, text/bg-success(-soft), text/bg-warning(-soft),
  text/bg-danger(-soft).
- NEVER hardcode hex values in components. Only var()-backed classes.

## Type

- Body: Geist (--font-sans). Display: Space Grotesk via `font-display` class,
  used on h1/h2/panel titles and big numbers (with -0.012em tracking applied
  globally to `.font-display`). Mono: Geist Mono for source chips/code.
- Scale is defined once in `@theme` (Tailwind `--text-*` + `--text-*--line-height`)
  so every `text-xs..text-4xl` lifts consistently. Body baseline is 17px
  (`--text-base`, line-height 1.7); prose steps carry loose leading, headings
  tight:
  - text-xs 13px/1.5 · text-sm 15px/1.6 · text-base 17px/1.7 · text-lg 19px/1.6
  - text-xl 22px/1.4 · text-2xl 26px/1.25 · text-3xl 33px/1.15 · text-4xl 40px/1.1
- `body` sets font-size 17px / line-height 1.6 as the inherited base.
- Lesson prose (components/artifacts/Markdown.tsx): paragraphs and lists are
  `text-base` with `leading-[1.75]` / `[1.7]`, capped at ~70ch, `text-pretty`;
  headings use `font-display` + `text-balance`.
- Metric numbers always get the `.tabular` class (tabular-nums).
- Tiny labels (eyebrows): `text-[11px] font-medium uppercase tracking-widest
  text-ink-faint`. Kept at 11px on purpose; use sparingly (max ~1 per panel).
  Body copy should be text-sm minimum, text-base for anything read at length.

## Color depth and glow

- Elevation: pick the surface token by layer, not one flat `bg-bg-raised`
  everywhere. Wells/insets -> bg-inset or bg/40; base cards -> bg-raised;
  hover/overlay/popover -> bg-overlay / bg-elevated.
- Glow helpers (globals.css): `.glow-accent`, `.glow-accent-strong`, and
  `.glow-hover` (lifts glow + border on hover; auto-disabled under reduced
  motion). `.accent-wash` paints a soft radial accent backdrop behind flagship
  surfaces. Glow is still rationed but now used a bit more generously per Yash's
  ask: flagship mission briefing + expert-verdict cards, selected simulation
  choice, primary continue button, dashboard mastery cards on hover, sidebar
  logo/active track. Do not carpet the UI with it.

## Motion (Emil Kowalski rules)

- Library: `motion/react` (import { motion, AnimatePresence, useReducedMotion }).
- Standard ease: `cubic-bezier(0.23, 1, 0.32, 1)` -> `const EASE = [0.23, 1, 0.32, 1]`.
  Also registered as the `--ease-brand` token / `ease-brand` utility for CSS
  transitions.
- Entrances: opacity 0 + y 8-14px, duration 0.22-0.30s, stagger 40ms.
- Data reveals (bars, rings, paths): 0.5-0.8s, same ease.
- Popovers: 0.15s, scale from 0.95, origin-aware (e.g. origin-top-right).
- Score/verdict reveals: scale 0.8 -> 1 pop, ~0.4s, after the per-item stagger
  (see ExpertReview overall verdict).
- Stage-to-stage (SimulationPlayer): each new stage re-mounts via `key={stageId}`
  and slides in x 12 -> 0 at 0.26s.
- Metric delta badges animate in on change (AnimatePresence, y 4 -> 0, 0.2s).
- Micro-interactions: cards use `.glow-hover` / hover border; buttons use
  `active:scale-[0.97]` (0.98/0.99 for large surfaces).
- EVERY animated component calls `useReducedMotion()` and passes
  `initial={reduce ? false : {...}}` (or swaps slide for fade). A global
  `@media (prefers-reduced-motion: reduce)` block also damps all CSS
  transitions/animations as a safety net.
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
