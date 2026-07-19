# Praxis design system (DESIGN.md)

Every UI change in this repo follows these rules. They come from four skills
Yash installed (frontend-design, emilkowal-animations, ui-ux-pro-max,
design-taste-frontend) and are locked as policy in AGENTS.md 8d.

## Tokens (app/globals.css)

- Surface ladder (deepest -> highest), faint cool-violet tint so elevation
  reads as depth not just lighter gray: `--bg-inset #060507`, `--bg #09090b`,
  `--bg-raised #111014`, `--bg-overlay #191820`, `--bg-elevated #221f2b`.
  Borders `--border` (7% white) / `--border-strong` (14% white). Text
  `--text #f5f5f8` / `--text-muted #c2c2cf` / `--text-faint #8f8fa0` (Iteration
  D1: ramp brightened one full step across the board to fix the "gray fog"
  problem).
  - **`--text-faint` is decorative-only.** It may be used ONLY for labels
    nobody needs to read to use the product: tiny eyebrow captions, disabled/
    locked-state icon tint, watermark-style timestamps. Any copy that carries
    information a user must read (body text, descriptions, secondary values,
    empty-state copy) uses `--text-muted` or brighter. This is a hard rule
    going into D2/D3: audit every existing `text-ink-faint` and `text-faint`
    use and move it to `text-ink-muted` unless it is genuinely decorative.
- ONE accent family drives all color: `--accent`, `--accent-bright` (brightened
  a step), `--accent-soft` (~15-16% fill), `--accent-glow` (42% for shadows).
- Status colors are first-class tokens with soft fills: `--success` +
  `--success-soft`, `--warning` + `--warning-soft`, `--danger` + `--danger-soft`
  (utilities `bg-success-soft` etc, plus the existing `bg-success/10` opacity
  form). Use them for status states, not just red/green text.
- `--info` (`#38bdf8`, soft sky blue) + `--info-soft` (`rgba(56,189,248,0.14)`):
  a fourth first-class status/meaning color for neutral informational chips
  and panels (e.g. "today's plan"), same soft-fill pattern as
  success/warning/danger. Utilities: `bg-info`, `text-info`, `bg-info-soft`.
- Track theming: set `data-accent="seo|marketing|analytics|ai|finance"` on any
  wrapper; every descendant that uses accent classes recolors automatically.
  seo=emerald, marketing=electric purple, analytics=amber, ai=cyan,
  finance=deep gold, default=indigo.
- Tailwind utilities from tokens: bg-bg-inset, bg-bg, bg-bg-raised,
  bg-bg-overlay, bg-bg-elevated, border-line, border-line-strong, text-ink,
  text-ink-muted, text-ink-faint, bg-accent, text-accent, text-accent-bright,
  bg-accent-soft, text/bg-success(-soft), text/bg-warning(-soft),
  text/bg-danger(-soft), text/bg-info(-soft).
- NEVER hardcode hex values in components. Only var()-backed classes.

## Fixed panel color assignment (dashboard, Iteration D)

Every L0 dashboard panel's `.chip-icon` (and any panel-level color accent)
uses a FIXED meaning-to-color mapping, not a rotating palette, so the same
panel always reads the same color across sessions:

- Mastery -> accent (track accent, or indigo on the global dashboard)
- Streak -> warning
- Deadlines -> danger
- Today's plan -> info
- Latest scores -> success
- Recommendations -> accent-bright
- System Health -> status-driven (success when healthy, danger when any
  error is present; never a fixed color, because its whole job is to report
  state)

## New utilities (app/globals.css, Iteration D1)

- `.chip-icon`: 32px square, rounded-lg, soft tinted background derived from
  `currentColor` via `color-mix`, sized for a small duotone Phosphor icon.
  Set `color` (e.g. `text-warning`) on the element and both the icon and its
  background tint follow automatically. Used for every dashboard panel title
  icon per the fixed assignment above.
- `.card-hover`: standard hover recipe for any clickable card or panel. On
  hover: border brightens to `--border-strong`, background steps up to
  `--bg-overlay`, `translateY(-2px)`, plus a `0 4px 24px black/35%` shadow and
  a 12%-strength accent glow. Transition 160ms with the brand ease
  `cubic-bezier(0.23,1,0.32,1)`. Under `prefers-reduced-motion` the translate
  is dropped; color/border/shadow changes remain.
- `.row-hover`: hover treatment for list rows (score rows, deadline rows,
  recommendation rows). Tints the row background with accent at ~6% and
  brightens text to `--text`. Deliberately has NO left border stripe; that
  pattern is banned per the design-taste-frontend skill.
- `.hl`: inline highlight span for key metric words inside prose. Accent-soft
  background, small padding, rounded corners, accent-bright text. Use
  sparingly, 2-3 per lesson view maximum.
- `.glow-breathe`: 3.5s infinite alternating soft box-shadow pulse (accent
  glow, opacity only, no layout shift). Reserved for EXACTLY two elements
  app-wide: the dashboard "resume where you left off" card and the Copilot
  floating button. Do not add it to a third element without removing it from
  one of the other two. Fully disabled (no animation, no shadow) under
  `prefers-reduced-motion`.
- `.panel-tinted`: paints a 3%-strength accent wash behind an element, fading
  to transparent by 40% of the element's height (linear gradient, top to
  bottom). Purely decorative background layer via `::before`; does not affect
  layout. Use on panel/section wrappers that should feel like they belong to
  the current track accent without becoming a fully colored card.

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
  surfaces. `.panel-tinted` paints a much fainter (3%) accent wash for panel
  headers, fading out by 40% height. Glow is still rationed but now used a
  bit more generously per Yash's ask: flagship mission briefing + expert-verdict
  cards, selected simulation choice, primary continue button, dashboard mastery
  cards on hover, sidebar logo/active track. Do not carpet the UI with it.
- `.glow-breathe` (pulsing glow, 3.5s, disabled under reduced motion) is
  reserved for exactly two elements app-wide: the dashboard resume card and
  the Copilot button. This budget is separate from and stricter than the
  general glow rationing above; never add it elsewhere.

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
