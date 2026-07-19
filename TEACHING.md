# TEACHING.md - Praxis Teaching Method v1 + Chart Catalog XL

Authored by Fable 5 (2026-07-19). This is the durable spec for HOW Praxis
teaches and WHAT visual/interactive artifacts exist. Curriculum generation,
lesson authoring, and executor agents must comply with this file. PLAN.md
holds the execution order; this file holds the method.

No lesson may violate the density rules below. Concept CLARITY remains the
number one metric (AGENTS.md hard rules).

---

## 1. The Praxis Loop (mandatory lesson skeleton)

Every lesson follows this eight-beat arc. Beats 1 to 7 appear in every
lesson; beat 8 appears at module boundaries.

1. **Hook** (mission block): a real scenario with stakes and a deliverable.
   The learner is a person with a job to do, never a reader.
2. **Ground** (text block, short): define every new term in plain language,
   then one real-world analogy. This is most of the lesson's reading budget.
3. **Show** (chart-xl / infographic / worked example): the concept made
   visible. Numbers are ALWAYS shown as a chart, never as prose lists.
4. **Do** (simulation / interactive artifact): the learner makes decisions
   and sees consequences. At least one Do beat per lesson.
5. **Check** (scored block: quiz, card-match, hotspot, scenario, or a
   chart-xl probe): immediate check for understanding, auto-scored.
6. **Reflect** (reflection + expert-review blocks): the learner writes what
   they decided and why; the expert view contrasts it.
7. **Retain** (flashcard-deck block): 6 to 12 application-phrased cards
   feeding the spaced-repetition queue.
8. **Stretch** (module boundary): teach-back checkpoint or harder mission
   replay variant.

### Density rules (validator-enforced later, authoring rules now)

- Reading (text + analogy blocks) is at most 20 percent of blocks.
- At least 3 distinct interactive families per lesson.
- At least 1 scored block that is not a plain quiz.
- Every chart-xl block must carry a `caption` (the one-line takeaway) AND
  at least one of `story` or `probe`. Decorative charts are banned.
- Every lesson ends with a flashcard-deck block.
- Every mission chain closes: mission, simulation, reflection,
  expert-review all present when a mission opens the lesson.

---

## 2. Chart Catalog XL: the `chart-xl` block

### Rendering decision (locked)

- Library: **echarts** (apache) + **echarts-wordcloud**, imported via
  `next/dynamic` with SSR off and a skeleton fallback, so the lesson
  player bundle stays lean and charts never block first paint.
- One component: `components/artifacts/ChartXLBlock.tsx` maps `kind` to an
  ECharts option. Canvas renderer. Colors, fonts, and grid lines read the
  design tokens at mount (accent ramp from `--accent`, text from
  `--text-muted`, surfaces from `--bg-elevated`); never hardcoded hex.
- `useReducedMotion` true sets `animation: false`; otherwise entrance
  animation 300ms with the brand ease equivalent.
- Existing `chart` (simple bar) and `chart-advanced` (bubble, heatmap,
  sankey hand-built SVG) blocks stay untouched for back-compat with stored
  lessons. New content uses `chart-xl`. The curriculum palette steers
  generation to `chart-xl` only.

### Schema (lib/blocks.ts)

```ts
chartXlBlock = {
  type: "chart-xl",
  id: string,                 // unique within lesson
  title: string,
  kind: enum [
    "bar", "stacked-bar", "line", "area", "scatter", "candlestick",
    "pie", "donut", "radar", "funnel",
    "sunburst", "treemap",
    "sankey", "graph", "themeriver",
    "heatmap", "bubble", "wordcloud", "gantt"
  ],
  unit: string (default ""),
  caption: string,            // REQUIRED one-line takeaway
  // exactly ONE data payload, matched to kind family:
  cartesian?: {               // bar, stacked-bar, line, area
    categories: string[] (2..24),
    series: { name: string, values: number[] }[] (1..6)
  },
  points?: {                  // scatter, bubble
    series: { name: string,
      points: { x: number, y: number, size?: number, label?: string }[] }[]
  },
  candles?: {                 // candlestick
    categories: string[],
    values: [open, close, low, high][]   // echarts order
  },
  parts?: {                   // pie, donut, funnel, wordcloud
    items: { name: string, value: number }[] (2..40)
  },
  radar?: {
    axes: { name: string, max: number }[] (3..8),
    series: { name: string, values: number[] }[] (1..3)
  },
  tree?: {                    // sunburst, treemap
    nodes: TreeNode[]         // { name, value?, children? }, depth <= 4
  },
  flow?: {                    // sankey, graph
    nodes: { id: string, label: string }[] (2..30),
    links: { from: string, to: string, value: number }[]
  },
  river?: {                   // themeriver
    series: string[] (2..6),
    points: { date: string, series: string, value: number }[]
  },
  grid?: {                    // heatmap
    rowLabels: string[], colLabels: string[], values: number[][]
  },
  tasks?: {                   // gantt
    items: { label: string, start: number, end: number, group?: string }[]
  },
  // playable layers (at least one required, both allowed):
  story?: {                   // progressive insight reveal, Next button
    steps: { text: string, focus?: string }[] (1..6)
    // focus = series name / node id / category to highlight via dispatchAction
  },
  probe?: {                   // scored question about the chart
    question: string,
    options: { id: string, label: string, correct: boolean }[] (2..5),
    explain: string
  }
}
```

### validateChartXlRefs (standalone, called from lessonContentSchema
superRefine, repo convention)

- Exactly the payload matching `kind` is present; all others absent.
  Kind to payload map: cartesian(bar, stacked-bar, line, area),
  points(scatter, bubble), candles(candlestick), parts(pie, donut,
  funnel, wordcloud), radar(radar), tree(sunburst, treemap),
  flow(sankey, graph), river(themeriver), grid(heatmap), tasks(gantt).
- cartesian: every series.values length equals categories length.
- candles: values length equals categories length.
- radar: every series.values length equals axes length.
- grid: values row count equals rowLabels length, every row equals
  colLabels length.
- flow: every link from/to resolves to a node id; sankey has no
  self-links.
- river: every point.series is in series[].
- tasks: end > start for every item.
- story.focus, when set, must resolve to a series name, category, node
  id/name, or part name present in the payload.
- probe: exactly one option has correct true.
- At least one of story or probe present (density rule, enforced here).

### Scoring

`probe` is a scored interaction: correct on first try = 100, correct on
retry = 60, revealed = 20 (matches mission scoring bands). Synced through
the existing progress flow like other scored blocks; counts toward the
"scored non-quiz" density rule.

---

## 3. Chart selection decision table (for authors and the curriculum engine)

Pick by the QUESTION the concept answers, not by variety:

| Concept question | Kind | SEO/GEO exemplar |
|---|---|---|
| How do parts make a whole? | pie / donut | Traffic mix by channel |
| How does a whole decompose hierarchically? | sunburst | Query intent taxonomy (informational > comparison > ...) |
| Many parts, which dominate? | treemap | Content inventory by section and pageviews |
| Composition across categories? | stacked-bar | SERP feature share per keyword cluster |
| Where do we lose volume in stages? | funnel | Impressions > clicks > sessions > conversions |
| How does a value move over time? | line | CTR by SERP position curve; rank tracking |
| Cumulative growth over time? | area | Indexed pages / backlink growth |
| How does SHARE shift over time? | themeriver | Topic share of search demand across a year |
| Volatility or range over time? | candlestick | Weekly rank high/low volatility during an update |
| Compare items on one measure? | bar | Domain rating of competitors |
| Compare items on many dimensions? | radar | E-E-A-T dimensions of two pages |
| Do two variables relate? | scatter | Keyword difficulty vs search volume |
| Three variables at once? | bubble | Difficulty vs volume vs current rank (size) |
| Where is it hot in a 2D grid? | heatmap | CTR by position x device |
| Where does quantity FLOW? | sankey | Crawl budget or link equity flow through site sections |
| What is connected to what? | graph | Internal link structure around a hub page |
| What words dominate? | wordcloud | N-grams in top-ranking competitor titles |
| When does work happen? | gantt | 90-day SEO sprint plan |

Rule: if the lesson states more than two numbers in prose, convert them to
a chart-xl with a probe.

---

## 4. Flashcards + spaced repetition (final design, unchanged from PLAN v2)

- Block: `flashcard-deck` { id, title, cards: 5..30 of { id, front, back,
  tag? } } + validateFlashcardRefs (unique card ids).
- Cards are APPLICATION-phrased: front is a situation or decision question
  ("Client's blog has 300 thin tag pages. Index or noindex?"), back is the
  decision plus the why in 2 sentences. Definition-only cards are allowed
  for at most a third of a deck.
- Persistence: `supabase/migrations/0003_review_state.sql`, table
  review_state (user_id, card_key = lessonId:deckId:cardId, ease_factor,
  interval_days, due_at, reps, lapses), RLS owner-only, index
  (user_id, due_at).
- Scheduler: SM-2-lite, server-side in `/api/review` action "grade".
  again: interval 1d, ease -0.2. hard: interval x1.2, ease -0.15.
  good: interval x ease. easy: interval x ease x 1.3, ease +0.15.
  Ease starts 2.5, floor 1.3.
- `/review` page: cross-track due queue, 3D flip (crossfade under reduced
  motion), 4 grade buttons (danger/warning/accent/success). Sidebar badge
  with due count, fail-soft. Dashboard "Cards due" card.
- Reminder: `/api/cron/review-reminder` guarded by x-cron-key, ntfy
  "N cards due today", n8n schedule 09:30.

---

## 5. Execution order for this spec (see PLAN.md v3 addendum)

- Batch X1 (Sonnet): chart-xl schema + validators + tests; flashcard-deck
  schema + validators + tests; migration 0003_review_state.sql; palette
  entries in lib/curriculum.ts. No UI.
- Batch X2 (Opus): ChartXLBlock.tsx (echarts + wordcloud deps installed
  here), ArtifactRenderer wiring, probe scoring into LessonPlayer.
- Batch X3 (Opus): FlashcardDeck.tsx + /api/review + /review page +
  sidebar badge + dashboard card.
- Batch X4 (Sonnet): review-reminder cron + n8n workflow.
- Then: Fable authors SEO/GEO content lesson by lesson using this method;
  executors only import/wire. Iteration D (readability/design overhaul)
  continues per PLAN.md.
