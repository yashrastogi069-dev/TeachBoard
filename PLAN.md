# PLAN.md — Praxis "Learning by Doing" upgrade

Planner: Fable (high). Executors: Opus/Sonnet subagents (xhigh). Small chores
(md updates, tiny edits): Haiku. Reviewer: Yash (visual review after every
iteration; nothing ships as final without his approve/revise). This file is
the contract for the whole upgrade; RUN_STATE.md tracks live progress.

## Vision (from Yash, non-negotiable)

Praxis today teaches well but reads like pages. It must become a platform where
every concept is EXPERIENCED, not read. Reading never exceeds 10-20% of a
lesson. The rest is interaction, simulation, experimentation, reflection,
practice, coaching, feedback. The signature loop, applied per concept:

Mission -> Simulation -> Decision -> Consequence -> Reflection ->
Expert Review -> Replay -> Mastery -> Harder Scenario

Nothing on mainstream platforms does this loop. It is the product.

## Architecture (locked)

### The mission chain (4 new blocks, appear together in order)

1. `mission` — framing card: role, stakes, objective, constraints, briefing.
   The learner is dropped into a job, not a chapter.
2. `simulation` — branching, stateful decision engine:
   - `metrics`: 1-4 named quantities (traffic, budget, trust...) with start
     values and optional goals.
   - `stages`: 2-6 decision points. Each choice has quality (best/good/poor),
     narrative feedback, metric effects (deltas), and optional forward-only
     branch (`goTo`), which guarantees termination.
   - The component renders live metric readouts + a consequence trajectory
     chart built from the learner's OWN decisions. Debrief markdown at the end.
3. `reflection` — structured "why did that happen" prompt with guidance.
4. `expert-review` — AI persona (senior practitioner) receives the actual
   decision path + reflection, critiques each decision against a rubric,
   returns per-decision verdicts + overall score. Rendered as an annotated
   review panel.

Cross-block state: `MissionContext` (React context provided in LessonPlayer)
carries { decisions path, metric trajectory, reflection text } from simulation
-> reflection -> expert-review. Blocks stay independent components; the
context is the only coupling.

Zod note: `simulationBlock` uses superRefine (reference + forward-branch
validation), which cannot sit inside `z.discriminatedUnion`. Executor must
split it: a plain object schema in the union + exported `validateSimulation`
refinement applied in `lessonContentSchema` (and unit-tested).

### Persistence

New table `mission_runs`: id, user_id, lesson_id, block_index, path jsonb
(stage/choice/quality sequence), metrics jsonb (trajectory + finals),
reflection text, expert_review jsonb, outcome, variant int (0 = base,
1+ = harder replays), mastery int, created_at. RLS: owner-only. Feeds the
dashboard mastery layer (iteration 5).

New route `app/api/mission/route.ts`:
- POST save run (auth'd, validates lesson ownership pattern used by /api/tutor)
- POST /api/mission/review: builds expert critique via lib/ai/provider chain,
  logs tokens to api_usage, reports failures via lib/notify reportEvent.

### Scoring (deterministic, unit-tested in lib/blocks.ts)

- `simulateMetrics(block, path)` — pure trajectory computation.
- `scoreSimulation(block, path)` — best=100 good=60 poor=20, averaged.
- Lesson mastery now averages ALL scored blocks (quiz, card-sort, simulation,
  expert-review score).

## Full block inventory after upgrade

Existing 13: text, analogy, worked-example, flowchart, quiz, card-sort,
slider-sim, compare, chart, video, scenario, tree-map, terminal-sim.

New (iteration 1): mission, simulation, reflection, expert-review.
New (iteration 2): flashcards (+ spaced repetition system + /review page).
New (iteration 3): graph-diagram, framework-canvas, financial-statement,
chart-advanced, timeline, card-match, whiteboard, infographic, hotspot.
New (iteration 4): ga4-sim, serp-sim CONTENT built on the hotspot primitive
(no new schema — see iteration 3 family I).
New (iteration 5): assignment (real-world homework through grading engine).

## Iterations (pause for Yash approve/revise after each)

### Iteration 1 — Mission Engine core  [IN PROGRESS]
- lib/blocks.ts: 4 schemas (mission/simulation/reflection/expert-review
  partially landed), union wiring, validateSimulation, scoring, tests.
- supabase migration mission_runs + RLS.
- /api/mission (save + expert review).
- components/artifacts/MissionBlocks.tsx + MissionContext + ArtifactRenderer
  wiring + LessonPlayer mastery integration.
- Curriculum palette prompt gains the 4 blocks + chain composition guidance.
- 1 premium demo lesson authored with the full chain, imported, verified live.
- Design polish pass (added by Yash 2026-07-10): richer color usage beyond
  the single accent, more purposeful animation, larger base font size and
  improved readability across the whole app. Driven by the design skills:
  impeccable, ui-ux-pro-max, design-taste-frontend, frontend-design,
  emilkowal-animations. Runs after the Mission Engine UI lands (same files).
Acceptance: build + tests green; full chain playable in browser; run persisted
in mission_runs; expert review streams back with per-decision critique;
design pass applied app-wide.

### Iteration 2 — Retention system

Fable design (flashcards, detailed now instead of just named):

**`flashcard-deck` block**: `title`, `cards: array of {id, front: string
(question/term/scenario snippet), back: string (answer/definition/why),
tag: optional string (sub-concept, for the review queue to explain WHY a
card resurfaced)}` (min 5 max 30 per deck; a lesson can carry more than one
deck if it covers distinct sub-skills). Cards should test APPLICATION not
just recall where possible ("A client's canonical tag points to a 404 - what
happens to link equity?" beats "Define canonical tag") — this is a curriculum
prompt rule, not a schema field.

**Spaced repetition engine** (SM-2-lite, simplified from the classic SuperMemo
SM-2 algorithm since 4-grade Anki-style buttons are overkill for a v1):
- New table `review_state`: id, user_id, card_id (deck block index + card id
  composite, or a synthetic key), track_id, ease_factor (float, starts 2.5),
  interval_days (int, starts 1), due_at (timestamptz), last_grade
  ("again"|"hard"|"good"|"easy"), reps (int), created_at, updated_at. RLS
  owner-only.
- Grading a card updates: again -> interval resets to 1 day, ease -0.2 (floor
  1.3); hard -> interval * 1.2, ease -0.15; good -> interval * ease_factor;
  easy -> interval * ease_factor * 1.3, ease +0.15. due_at = now + interval.
  This is the standard SM-2 ease-factor adjustment, simplified to skip the
  quality-0-5 scale in favor of the 4 buttons learners actually expect
  (Anki-style, well-understood UX, no learning curve for Yash).
- `/review` page: due-today queue pulled across ALL tracks (not scoped to one
  track — the review habit should feel like one daily ritual), card flips on
  tap/click, 4 grade buttons, progress count, empty state when queue is
  clear. Sidebar nav entry ("Review", badge shows due count).

- Spaced-repetition REMINDERS (Yash 2026-07-10): daily n8n/Vercel cron job
  (new /api/cron/review-reminder, guarded by x-cron-key like the existing
  cron routes) checks review_state for cards due today per user and pushes
  a ntfy alert ("N cards due for revision today") via lib/notify, same
  free-tier path already used for deadline reminders. Also surfaces due
  count as a dashboard card/badge, not just the push.
Acceptance: cards flip, grades (again/hard/good/easy) schedule next review,
due queue populates across tracks, a due-today card triggers a real ntfy
push and shows on the dashboard.

### Iteration 3 — Artifact catalog v2 (Yash 2026-07-10 request)

Yash supplied a large example list: interactive flowcharts, animated process
diagrams, dynamic decision trees, draggable cards, interactive mind maps,
business canvases, sliders, timelines, expandable knowledge graphs,
interactive financial statements, interactive SWOT/Porter's Five
Forces/PESTEL, treemaps, Sankey diagrams, bubble charts, heatmaps, network
graphs, relationship maps, animated value chains, AI whiteboards, process
builders, drag-and-drop frameworks, matching exercises, sequence builders,
interactive roadmaps, interactive org charts, plus "add others as well."

Fable design decision: 25+ examples collapse into a much smaller set of
flexible, reusable schema families (AGENTS.md's own rule is that adding
artifact TYPES is the only thing that needs new code — so the fewer, more
composable the primitives, the more that rule keeps paying off). Building 25
bespoke one-off components would be slower to ship, harder to keep
consistent, and harder for the curriculum AI to target reliably. Instead:

**A. `graph-diagram`** — one node/edge engine, `layout: "flow" | "tree" |
"network"` discriminator:
- `flow`: animated process diagrams, value chains (sequential highlight of
  the active edge/node as the learner steps through, upgrades the existing
  flowchart block with animation and step-through instead of static render).
- `tree`: dynamic decision trees, expandable knowledge graphs, mind maps,
  org charts (parent/children, click-to-expand, unlimited depth unlike the
  2-level tree-map block which stays as-is for simple decompositions).
- `network`: network graphs, relationship maps (force-directed-feeling
  layout via a deterministic layout algorithm, draggable nodes, no physics
  library — position via a simple iterative repulsion pass computed
  server/client-side, small graphs only, 8-20 nodes).
Covers: interactive flowcharts, animated process diagrams, dynamic decision
trees, interactive mind maps, expandable knowledge graphs, network graphs,
relationship maps, animated value chains, interactive org charts.

**B. `framework-canvas`** — configurable grid of labelled cells,
`framework: "custom" | "swot" | "porters-five-forces" | "pestel" |
"business-model-canvas"` picks the built-in grid geometry (2x2 for SWOT,
5-zone radial-or-grid for Porter's, 6-cell for PESTEL, 9-block for BMC);
`custom` accepts any cell layout. Two modes: `presented` (AI fills every
cell, learner studies a worked real-company example) and `drafted` (cells
start empty, learner fills their own analysis of a case, then compares
against an AI model-answer cell-by-cell — reuses the expert-review critique
pattern from the Mission Engine for the comparison).
Covers: business canvases, interactive SWOT, interactive Porter's Five
Forces, interactive PESTEL.

**C. `financial-statement`** — line-item statement (P&L / balance sheet /
cash flow, `statementType` field) with drill-down per line, an optional
"what-if" driver slider per assumption (reuses slider-sim math: base + factor)
that live-recalculates dependent totals, so the learner sees a decision
ripple through real numbers.
Covers: interactive financial statements.

**D. `chart-advanced`** — extends the existing lightweight no-dependency
chart block with `variant: "bubble" | "heatmap" | "sankey"` (treemap already
exists as tree-map, timeline gets its own block below since it's
chronological rather than magnitude-based). Same "no new chart libraries"
constraint as the existing chart/tree-map blocks: hand-built SVG.
Covers: treemaps (existing), Sankey diagrams, bubble charts, heatmaps.

**E. `timeline`** — chronological events with expandable detail per
milestone, optional category filter chips, optional "current position"
marker (useful for roadmaps showing where the learner's hypothetical project
stands today).
Covers: interactive roadmaps, timelines.

**F. `card-match`** — one drag/tap mechanic (tap-to-place, per the existing
accessibility decision, never real drag-and-drop) with `mode: "match-pairs" |
"sequence" | "assemble"`:
- `match-pairs`: term-definition or cause-effect matching.
- `sequence`: order steps into the correct process order.
- `assemble`: build a process/framework from a pool of correct + distractor
  pieces (drag-and-drop framework building, process builders).
Deterministic scoring per mode, unit-tested like scoreCardSort.
Covers: draggable cards, matching exercises, sequence builders, process
builders, drag-and-drop frameworks.

**G. `whiteboard`** — the genuinely novel one. A freeform canvas (hand-built,
no dependency) where the learner places sticky notes and connects them with
arrows to build their OWN mental model of a concept (e.g. "map how these 6
SEO ranking factors interact"). Placement is tap-to-place-then-arrow-key-nudge
(accessible, no raw mouse-drag requirement, though pointer-drag is a
progressive enhancement on top). When the learner marks it done, POST to a
new `/api/mission` action `whiteboard-review` (same AI-critique shape as
expert-review: persona + rubric + the learner's actual note/connection graph)
returns a critique of what's right, what's missing, what's miswired.
Covers: AI whiteboards.

**H. `infographic`** — a single-scroll visual explainer, distinct from
`framework-canvas` (which is a fixed analytical grid): `title`,
`layout: z.enum(["stat-row","icon-process","comparison-strip","big-number"])`,
and layout-appropriate items:
- `stat-row`: `stats: array of {value: string, label: string, icon: optional
  string (Phosphor icon name), trend: optional "up"|"down"|"flat"}` (min 2
  max 6) — the classic "47% / of searches now / are zero-click" band.
- `icon-process`: `steps: array of {icon: string, title, detail}` (min 3
  max 6) — a horizontal icon-led process strip (lighter-weight than a full
  graph-diagram flow, for when the point is visual rhythm not navigable
  structure).
- `comparison-strip`: `left: {label, points: string[]}, right: {label,
  points: string[]}` — reuses the spirit of the existing compare block but
  as a punchier side-by-side visual card grid instead of prose paragraphs.
- `big-number`: `headline: string, value: string, context: string` — one
  huge stat with framing, for a single gut-punch fact worth pausing on.
Covers: infographics generally (stat visuals, icon rows, comparison visuals,
big-number call-outs) — explicitly requested by Yash, adds visual variety
between denser interactive blocks so the lesson has rhythm, not just a wall
of simulations back to back.

**I. `hotspot`** — "find the N problems" on a rendered scene: `title,
scenarioMarkdown` (sets up what's being inspected — a page, a report row, a
campaign setup), `imageless render mode` (no actual screenshot needed; the
scene is described as structured regions so it stays text-buildable by the
AI): `regions: array of {id, label, x: 0-100, y: 0-100, width: 0-100,
height: 0-100, isIssue: boolean, explanation: string}` (min 4 max 12, at
least 2 isIssue true and at least 1 false as a decoy), learner taps regions
they believe are issues, gets per-region feedback + a final score
(true-positives found minus false-positives clicked, clamped 0-100, same
penalty style as scoreCardMatch's assemble mode). Reuses the tap-target
mechanic already proven safe/accessible by card-sort and card-match.
Covers: the "find-the-answer" spirit originally scoped for iteration 4's
ga4-sim/serp-sim, generalized into one reusable primitive; ga4-sim/serp-sim
in iteration 4 become CONTENT built on this primitive (a specific
scenarioMarkdown + regions describing a GA4 report or a SERP) rather than
new schemas, cutting iteration 4 down to content + one thin visual skin.

**Slider** already exists (slider-sim). No new schema needed there.

### Iteration 3 build order (dependency-aware, parallel where possible)
1. Fable finalizes exact zod field shapes for all 9 families (this session;
   families A-G landed first, H infographic + I hotspot added after, as a
   schema batch 2 to avoid colliding with the batch-1 schema agent mid-edit).
2. Sonnet: implement schemas + union wiring + deterministic scoring helpers
   (scoreCardMatch per mode, scoreHotspot, chart-advanced/graph-diagram/
   framework-canvas/financial-statement/timeline/infographic are
   presentational or AI-reviewed, no local score) + thorough unit tests.
   Batch 1 (A-G) and batch 2 (H-I) run as sequential passes on lib/blocks.ts
   to avoid two agents editing the same file at once.
3. Opus batch A: graph-diagram + timeline renderers.
   Opus batch B: framework-canvas + financial-statement + chart-advanced
   renderers.
   Opus batch C: card-match + whiteboard renderers (+ whiteboard-review
   route action, following the existing /api/mission review pattern).
   Opus batch D: infographic + hotspot renderers.
   Batches A/B/C/D touch disjoint new component files so they can run in
   parallel once schemas land; ArtifactRenderer wiring happens after, to
   avoid merge conflicts on one shared file.
4. Sonnet: wire all new cases into ArtifactRenderer.tsx, extend the
   curriculum.ts palette with usage guidance + good/bad examples for each
   family, extend LessonPlayer interactiveCount/mastery for the new scored
   types.
5. Fable: pick 1-2 concrete real-world examples per family (e.g. an actual
   SWOT of a real-feeling NZ retail case, a real decision-tree scenario) and
   hand them to a Sonnet content agent to author into the existing demo
   lesson or a new showcase lesson, imported and verified live.

Acceptance: all 9 families render from AI-emitted JSON, pass zod validation,
have unit tests where scoring applies, build/tsc clean, at least one real
lesson exercises each family, Yash reviews visually and approves.

### Iteration 4 — Tool simulators
- ga4-sim: navigable mock GA4 report (tabs, dimension switches) where the
  answer must be FOUND; serp-sim: inspectable mock SERP with issues to spot.
  Both spec-driven JSON so the AI can generate infinite variants.
Acceptance: task prompt answered only by exploring the sim; scored. *add more SIMs*

### Iteration 5 — Mastery layer + assignments + harder replays
- assignment block -> existing grading engine + attempts history.
- Replay-with-mutation: /api/mission variant generation (harder constraints),
  mastery requires beating variant >= 1.
- Per-concept mastery model (mission wins, flashcard retention, assignment
  scores), dashboard mastery constellation + review queue panel; streaks count
  doing, not opens.
Acceptance: mastery visibly driven by doing; harder variant playable.

### Iteration 5b — Active recall trio (Yash approved 2026-07-10)

Three features Yash picked from Fable's proposals; Fable designs the
pedagogy and prompts, Opus/Sonnet build.

**1. Daily 5-minute drill mode** (`/drill` page + sidebar entry):
- Pulls the learner's WEAK areas: lessons with mastery < 70, flashcards
  with low ease_factor, mission concepts where the expert review scored
  weak decisions. Builds a rapid-fire session of 5-8 micro-challenges
  (existing scored block types reused at smaller scale: one quiz, one
  hotspot region, one card-match pair set, one sim single-stage decision).
- Timeboxed feel: progress bar, streak counter, "daily drill done" state
  that feeds the activity log and dashboard streak. One per day, resets
  midnight NZ time.
- Content source: no new generation; drills are sampled from ALREADY
  generated lesson blocks (cheap, instant, consistent). A drill_sessions
  table records date, items, scores, weak-area tags.

**2. Debate mode with the tutor** (mode toggle in the Copilot panel +
optional `debate` lesson block):
- The tutor takes a deliberately WRONG but plausible position on the
  lesson's concept ("Honestly, meta descriptions are a ranking factor,
  I'd spend the client's budget there first") and argues it well. The
  learner must correct it with reasoning. The AI concedes points only
  when the learner's argument is actually right, pushes back when it is
  weak, and after 3-5 exchanges drops the act and gives a scored debrief:
  what the learner got right, what they missed, the correct position
  stated cleanly.
- Implementation: a debate system prompt variant in the tutor route
  (mode: "debate" in the request, lesson-context aware), plus a
  `debate` block schema (topic, wrongPosition, keyPointsTheLearnerShouldRaise
  for the debrief rubric) so lessons can embed a staged debate at the
  right moment. Scores feed mastery like other interactive blocks.

**3. Teach-back checkpoints** (`teach-back` block):
- Schema: prompt ("Explain canonical tags to a client who is not
  technical, in under 150 words"), audience (who they are explaining to),
  rubric (3-5 criteria: accuracy, plain language, completeness, no
  jargon), minWords/maxWords.
- Learner writes the explanation; /api/grade-style AI call grades it
  against the rubric per criterion with specific feedback, returns score.
  The single best test of whether a concept is actually clear. Counts
  toward mastery. Curriculum prompt guidance: every module's final lesson
  should end with a teach-back of the module's core concept.

Acceptance: /drill works daily with real weak-area sampling; debate mode
holds a coherent wrong position and produces a fair scored debrief;
teach-back grades against rubric with per-criterion feedback; all three
feed mastery/streaks/activity.

### Iteration 6 — Curriculum engine rewrite + sample regeneration

Fable role (Yash 2026-07-10: "use Fable in the learning engine" too, not just
individual lessons): Fable personally designs the teaching-sequence logic
that decides WHICH artifact family fits a given concept (a decision-heavy
concept gets the mission chain, a comparative concept gets framework-canvas,
a process gets graph-diagram flow, a fact worth dwelling on gets an
infographic big-number, etc.), the interaction-density rules the validator
enforces, and the mastery-weighting model in iteration 5. Opus/Sonnet build
the generation pipeline, the validator code, and the regeneration tooling
around Fable's logic - the pedagogical judgment stays Fable's, same as
individual lesson content.

- Generation prompt: mission-chain mandatory, text/analogy <= 20% of blocks,
  interaction density validator that rejects and regenerates non-compliant
  output.
- Regenerate ONE module (Yash-picked or first SEO module) as the quality
  sample; Yash reviews before any wider regeneration.
Acceptance: regenerated module passes the composition validator; Yash
approves quality.

### Iteration 7 — Final verification (Fable)
- Whole-project pass: every feature exercised live, tests green, RUN_STATE
  and docs current, commit history clean, pushed. Yash does his own visual
  review; no screenshots delivered.

## Execution protocol

- Fable: architecture, schemas, prompts, judgment calls, final pass. ALSO
  (Yash 2026-07-10): Fable personally authors lesson CONTENT (missions,
  simulations, stories, examples) and ideates every new artifact type,
  infographic layout, and flashcard deck design. Creative and pedagogical
  quality is Fable work; executors never invent teaching content.
- Opus subagent: hardest component work (simulation player, tool sims).
- Sonnet subagents: routes, migrations, tests, curriculum plumbing.
- Haiku subagents: RUN_STATE.md/doc updates, mechanical chores.
- One task per subagent. Parallel where dependency-free.
- After every major task/agent completion (Yash 2026-07-10): Fable reviews
  the actual diff/output at MEDIUM effort before marking it done or chaining
  the next step — checks it matches the spec in this file, matches existing
  conventions, and didn't silently drop a requirement. This is separate from
  the iteration-end approve/revise checkpoint with Yash; it is Fable's own
  quality gate on each individual piece of executor output.
- Status narration always says which model is running.
- Commit per completed chunk in worktree `worktree-praxis-build`; merge
  ff-only to master and push per shipped iteration (RUN_STATE flow).
- Yash reviews visually himself; agents still self-verify in browser before
  claiming done. No screenshots sent to Yash.
- Never print .env values. No em dashes in prose for Yash. No placeholders.
