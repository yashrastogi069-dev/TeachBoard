import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aiJson } from "@/lib/ai/provider";
import { research } from "@/lib/apis/research";
import { reportEvent } from "@/lib/notify";
import { lessonContentSchema, type LessonContent } from "@/lib/blocks";

/*
  Generate-once-cache-forever content engine (AGENTS.md rule 6).
  ensureCurriculum builds the module/lesson/assessment skeleton for a track;
  ensureLessonContent fills one lesson with artifact blocks on first open.
  Both are grounded in fresh research so the material reflects current
  practice, and both are idempotent.
*/

const curriculumSchema = z.object({
  modules: z
    .array(
      z.object({
        slug: z.string().min(1),
        title: z.string().min(1),
        summary: z.string().min(1),
        difficulty: z.enum(["basic", "advanced", "pro"]),
        estMinutes: z.number().int().min(20).max(600),
        lessons: z
          .array(z.object({ slug: z.string().min(1), title: z.string().min(1) }))
          .min(3)
          .max(5),
        assessments: z
          .array(
            z.object({
              type: z.enum(["scenario", "project", "quiz"]),
              title: z.string().min(1),
              brief: z.string().min(1),
              rubric: z
                .array(
                  z.object({
                    criterion: z.string().min(1),
                    weight: z.number().min(5).max(60),
                    description: z.string().min(1),
                  })
                )
                .min(3)
                .max(6),
            })
          )
          .min(1)
          .max(2),
      })
    )
    .min(5)
    .max(8),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const PROFESSOR = `You are the Praxis professor: a practical, no-fluff corporate skills
teacher for Yash, a Master of Management graduate in Auckland, New Zealand who is
hunting for entry-level marketing/analytics roles and wants skills he can apply at
work the same week. Teaching rules that are non-negotiable:
- CLARITY first: define every term in plain language before using it.
- Real-world and practical: every concept ties to a task someone actually does on
  the job (real tools, real reports, real client situations).
- Current: it is mid-2026; prefer the provided research snippets over stale habits.
- No fluff, no motivational filler, no fabricated statistics.`;

export async function ensureCurriculum(trackSlug: string): Promise<{
  trackId: string;
  moduleCount: number;
  generated: boolean;
}> {
  const admin = supabaseAdmin();
  const { data: track, error: trackErr } = await admin
    .from("skill_tracks")
    .select("id, slug, title, tagline, active")
    .eq("slug", trackSlug)
    .single();
  if (trackErr || !track) throw new Error(`Unknown track: ${trackSlug}`);
  if (!track.active) throw new Error(`Track ${trackSlug} is not active yet`);

  const { count } = await admin
    .from("modules")
    .select("id", { count: "exact", head: true })
    .eq("track_id", track.id);
  if ((count ?? 0) > 0) {
    return { trackId: track.id, moduleCount: count ?? 0, generated: false };
  }

  const sources = await research(
    `${track.title} skills curriculum what to learn ${new Date().getFullYear()} practical guide`,
    6
  );
  const sourceText = sources
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const curriculum = await aiJson(
    curriculumSchema,
    PROFESSOR,
    `Design the complete "${track.title}" course (${track.tagline}).

Fresh research snippets to ground module choices (use them, do not copy them):
${sourceText || "(research unavailable; rely on well-established practice)"}

Requirements:
- 6 modules ordered from zero-knowledge to job-ready: 2 basic, 2-3 advanced, 1-2 pro.
- Module summaries say what the learner can DO afterwards, in one sentence.
- Each module: 3-5 lesson titles that build on each other, and 1-2 assessments.
- Assessments are REAL work simulations (audit a site, plan a campaign on a budget,
  write the report a manager asked for), never trivia. Each has a rubric of 3-6
  criteria with weights that sum to roughly 100, each criterion described concretely.
- Slugs: short kebab-case.

Return JSON: {"modules":[{"slug","title","summary","difficulty":"basic|advanced|pro","estMinutes":number,"lessons":[{"slug","title"}],"assessments":[{"type":"scenario|project|quiz","title","brief","rubric":[{"criterion","weight","description"}]}]}]}`,
    `curriculum/${trackSlug}`
  );

  let sortModule = 0;
  for (const mod of curriculum.modules) {
    sortModule++;
    const { data: insertedModule, error: modErr } = await admin
      .from("modules")
      .insert({
        track_id: track.id,
        slug: slugify(mod.slug),
        title: mod.title,
        summary: mod.summary,
        difficulty: mod.difficulty,
        sort_order: sortModule,
        est_minutes: mod.estMinutes,
      })
      .select("id")
      .single();
    if (modErr || !insertedModule) {
      await reportEvent(
        "error",
        "curriculum",
        `Module insert failed for ${trackSlug}/${mod.slug}: ${modErr?.message}`
      );
      continue;
    }
    const lessonRows = mod.lessons.map((l, i) => ({
      module_id: insertedModule.id,
      slug: slugify(l.slug),
      title: l.title,
      sort_order: i + 1,
    }));
    const { error: lessonErr } = await admin.from("lessons").insert(lessonRows);
    if (lessonErr) {
      await reportEvent(
        "error",
        "curriculum",
        `Lesson insert failed for ${trackSlug}/${mod.slug}: ${lessonErr.message}`
      );
    }
    const assessmentRows = mod.assessments.map((a, i) => ({
      module_id: insertedModule.id,
      type: a.type,
      title: a.title,
      brief: a.brief,
      rubric: a.rubric,
      sort_order: i + 1,
    }));
    const { error: assessErr } = await admin.from("assessments").insert(assessmentRows);
    if (assessErr) {
      await reportEvent(
        "error",
        "curriculum",
        `Assessment insert failed for ${trackSlug}/${mod.slug}: ${assessErr.message}`
      );
    }
  }

  return { trackId: track.id, moduleCount: curriculum.modules.length, generated: true };
}

const BLOCK_PALETTE = `Available block types (use 6-12 blocks, mix at least 5 types):
- {"type":"text","markdown":"..."} plain teaching prose, short paragraphs
- {"type":"analogy","title":"...","markdown":"..."} everyday-life analogy that makes the concept click
- {"type":"worked-example","title":"...","markdown":"..."} a real task done step by step with real-looking numbers clearly labeled as examples
- {"type":"flowchart","title":"...","nodes":[{"id":"a","label":"..."}],"edges":[{"from":"a","to":"b","label":"..."}]} process diagram, 3-8 nodes
- {"type":"quiz","question":"...","options":["..."],"correctIndex":0,"explanation":"..."} check understanding
- {"type":"card-sort","title":"...","buckets":[{"id":"b1","label":"..."}],"cards":[{"id":"c1","label":"...","bucketId":"b1"}]} drag items into categories
- {"type":"slider-sim","title":"...","description":"...","inputLabel":"...","min":0,"max":100,"step":1,"unit":"...","outputs":[{"label":"...","unit":"...","base":0,"factor":1.5}]} output = base + factor * input; pick base/factor so the relationship teaches the tradeoff
- {"type":"compare","title":"...","goodLabel":"...","badLabel":"...","goodMarkdown":"...","badMarkdown":"..."} good vs bad example side by side
- {"type":"chart","title":"...","unit":"...","series":[{"label":"...","value":42}]} small bar comparison
- {"type":"video","title":"...","searchQuery":"..."} points to a video worth watching for this topic
- {"type":"tree-map","title":"...","root":{"label":"...","children":[{"label":"...","detail":"...","children":[{"label":"...","detail":"..."}]}]}} expandable concept map that decomposes one big idea into 2-6 branches (branch children optional, max 5)
- {"type":"terminal-sim","title":"...","description":"...","steps":[{"command":"...","output":"...","note":"..."}]} step-through console walkthrough with real commands and realistic output, 2-8 steps
- {"type":"scenario","prompt":"...","hint":"..."} an open situation the learner should reason about with the tutor

Mission-chain blocks (the four below always travel together, in this order:
mission -> simulation -> reflection -> expert-review). Use this chain whenever
the concept is decision-heavy or has real-world stakes: something a
practitioner could get wrong on the job, where the "right answer" only shows
itself once you see the consequence of a choice. Skip the chain for purely
factual or definitional concepts (e.g. "what is a canonical tag") — use it for
concepts that are really about judgment under constraints (e.g. "which
canonical fix do you ship with 3 hours of dev time left").
- {"type":"mission","title":"...","role":"...","stakes":"...","objective":"...","constraints":[{"label":"...","value":"..."}],"briefing":"..."}
  Drops the learner into a job, not a chapter. "role" names who they become
  ("You are the freelance SEO auditor for a 14-room Rotorua lodge"). "stakes"
  says what is lost if they get it wrong in plain terms, never abstract risk.
  "objective" is the one-sentence win condition. "constraints" is 1-4 concrete
  limits (deadline, budget, tooling, headcount) that will force real tradeoffs
  in the simulation that follows. "briefing" is markdown scene-setting: what
  the learner is looking at right now (a report, a dashboard, a client email).
  GOOD EXAMPLE: role "You are the new PPC lead for a Christchurch outdoor gear
  retailer", stakes "Q4 ad spend is approved but the last agency overspent by
  40% with nothing to show for it, this is your one shot to prove the budget
  can work", objective "Hit the target cost-per-acquisition without running
  out of monthly budget before the last week", constraints [{"label":"Monthly
  budget","value":"$6,000 NZD"},{"label":"Target CPA","value":"under $45"}].
- {"type":"simulation","title":"...","metrics":[{"id":"...","label":"...","unit":"...","start":0,"goal":100,"higherIsBetter":true}],"stages":[{"id":"...","situation":"...","choices":[{"id":"...","label":"...","quality":"best|good|poor","feedback":"...","effects":[{"metricId":"...","delta":0}],"goTo":"..."}]}],"debrief":"..."}
  A branching decision engine. "metrics" are 1-4 named quantities the learner
  is managing (traffic, budget, trust, crawl-budget-waste); "start" and
  optional "goal" must be numbers a practitioner would recognize as realistic
  for the scenario's scale, never round marketing-deck numbers. "stages" are
  2-6 decision points; each stage's "situation" is markdown describing what is
  happening right now, and each of its 2-4 "choices" is honestly graded
  "best"/"good"/"poor" (never make the worst option obviously silly; a
  believable trap is more instructive than an easy tell), with "feedback"
  narrating the immediate consequence in-story and "effects" moving 1-4
  metrics by deltas that are proportionate to the metric's scale and to how
  good the choice was (best > good > poor, and poor can go negative). "goTo"
  is optional; when set it must point at a LATER stage's "id" (forward-only,
  never sideways or back) to create a genuine branch — omit it to fall through
  to the next stage in order. At least one choice across the whole simulation
  should set "goTo" so the path genuinely forks. "debrief" is markdown shown
  after the final stage, written as a general wrap-up (it cannot know which
  path the learner took).
  GOOD EXAMPLE metric: {"id":"cpa","label":"Cost per Acquisition","unit":"NZD",
  "start":68,"goal":45,"higherIsBetter":false}. GOOD EXAMPLE choice: {"id":
  "pause-worst-adset","label":"Pause the worst-performing ad set and
  reallocate its budget to the top performer","quality":"best","feedback":
  "CPA drops fast, but the top ad set's reach is small so scale is limited",
  "effects":[{"metricId":"cpa","delta":-14},{"metricId":"spend","delta":-800}]}.
- {"type":"reflection","prompt":"...","guidance":"..."}
  A "why did that happen" prompt answered against the learner's OWN path from
  the simulation just played, not a generic question. "guidance" names what a
  strong answer covers (the causal mechanism, not just a restatement of
  events) so the tutor can coach toward it.
  GOOD EXAMPLE: prompt "Your CPA dropped after you paused the worst ad set,
  but total conversions also dropped. Why did those two metrics move in
  opposite directions, and was that still the right call given the budget
  constraint?" guidance "A strong answer names the mechanism (reallocating
  budget to a smaller high-performing audience saturates fast) and weighs it
  against the stated constraint (the objective was CPA, not volume)."
- {"type":"expert-review","title":"...","persona":"...","rubric":["..."]}
  Closes the chain: an AI plays a credible senior practitioner and critiques
  the learner's actual decision path plus their reflection against a rubric of
  3-5 concrete criteria. "persona" is a specific, believable expert (name,
  seniority, domain), not "an expert". "rubric" criteria must be checkable
  against the specific decisions available in the simulation above them, not
  generic advice.
  GOOD EXAMPLE: persona "Priya Nair, senior technical SEO consultant, 11 years
  agency-side across NZ and Australian retail clients". rubric ["Diagnosed
  the duplicate content cause before proposing a fix", "Prioritized the
  highest-impact fix given only 3 hours of dev time", "Chose redirects over
  silent removal to preserve link equity"].

Composition rule: when the mission chain is used, it should open the lesson
(mission is block 1, or block 2 at most if one text/analogy block sets up the
term first) and run mission -> simulation -> reflection -> expert-review with
nothing else interleaved between them. Across the WHOLE lesson, text and
analogy blocks combined should stay under roughly 20% of all blocks; lean on
flowchart, worked-example, terminal-sim, tree-map, compare, quiz, and card-sort
to carry the rest of the concept-clarity work instead of more prose.

Extended blocks (business/strategy depth, richer visuals, more scored practice):
- {"type":"graph-diagram","title":"...","layout":"flow|tree|network","nodes":[{"id":"a","label":"...","detail":"..."}],"edges":[{"from":"a","to":"b","label":"..."}],"rootId":"a"} one node/edge engine, three treatments. "flow" is an animated step-through process or value chain (2-24 nodes); "tree" is a decision tree, org chart, or knowledge hierarchy anchored at rootId (every node must be reachable from rootId, no cycles); "network" is a relationship map with no single root, laid out automatically. Use this over the simpler "flowchart" block whenever the diagram has more than ~6 nodes, needs a hierarchy (tree), needs relationship mapping (network), or benefits from animated step-through; keep "flowchart" for a quick static 4-6 node process that does not need those treatments.
  GOOD EXAMPLE (tree): {"type":"graph-diagram","title":"Escalation path for a paid social outage","layout":"tree","rootId":"root","nodes":[{"id":"root","label":"Campaign spend spikes overnight","detail":"Alert fires at 2x average hourly spend"},{"id":"check","label":"Check budget caps","detail":"Confirm the account-level cap actually applied"},{"id":"pause","label":"Pause the ad set","detail":"Stops further spend while you investigate"}],"edges":[{"from":"root","to":"check"},{"from":"root","to":"pause"}]}
- {"type":"framework-canvas","title":"...","framework":"custom|swot|porters-five-forces|pestel|business-model-canvas","mode":"presented|drafted","cells":[{"id":"c1","label":"...","content":"..."}],"modelAnswer":[{"cellId":"c1","content":"..."}]} a named business framework rendered as its real grid geometry. "presented" mode ships every cell already filled with a worked example; "drafted" mode leaves cells for the learner to fill, then reveals modelAnswer (required in drafted mode) cell by cell for comparison. Use this over "compare" whenever the concept IS one of the four named frameworks or a genuine multi-cell strategic grid; keep "compare" for a simple two-option good-vs-bad comparison that is not a named framework.
  GOOD EXAMPLE: {"type":"framework-canvas","title":"SWOT for a regional outdoor gear retailer entering e-commerce","framework":"swot","mode":"presented","cells":[{"id":"s","label":"Strengths","content":"Existing loyal customer base and staff product expertise"},{"id":"w","label":"Weaknesses","content":"No in-house web development or fulfilment experience"},{"id":"o","label":"Opportunities","content":"Regional competitors have weak online presence"},{"id":"t","label":"Threats","content":"National retailers already dominate paid search for the category"}]}
- {"type":"financial-statement","title":"...","statementType":"income-statement|balance-sheet|cash-flow","lineItems":[{"id":"rev","label":"Revenue","value":50000,"indent":0,"isTotal":false}],"drivers":[{"id":"units","label":"Units sold","min":800,"max":2000,"step":50,"unit":"units","affects":[{"lineItemId":"rev","factor":45}]}]} a real line-item statement, optionally with up to 3 "what-if" sliders. Moving a driver to value V recalculates every line item it affects to V * factor, so the learner watches one assumption ripple through real numbers. Reach for this over prose explanation whenever a concept is fundamentally about how a number is built (margin, breakeven, cash runway) rather than told about in the abstract.
  GOOD EXAMPLE driver: {"id":"units","label":"Units sold per month","min":800,"max":2000,"step":50,"unit":"units","affects":[{"lineItemId":"revenue","factor":45},{"lineItemId":"cogs","factor":-22}]} (moving the single "units sold" assumption updates both revenue and cost of goods sold lines at once).
- {"type":"chart-advanced","title":"...","variant":"bubble|heatmap|sankey","unit":"...","bubblePoints":[{"label":"...","x":0,"y":0,"size":10}],"heatmapGrid":{"rowLabels":["..."],"colLabels":["..."],"values":[[0]]},"sankeyFlow":{"nodes":[{"id":"a","label":"..."}],"links":[{"from":"a","to":"b","value":10}]}} three magnitude-based chart types the simple "chart" bar block cannot show: "bubble" for three-variable comparison (x, y, and size, e.g. channels by cost vs conversion vs volume), "heatmap" for a two-dimension intensity grid (e.g. day-of-week x hour-of-day performance), "sankey" for how one pool of something splits and flows onward (e.g. budget allocation across channels then into outcomes). Only populate the one field matching "variant". Use the plain "chart" block instead when it is a simple single-series bar comparison.
- {"type":"timeline","title":"...","events":[{"id":"e1","date":"...","title":"...","detail":"...","category":"..."}],"categories":["..."],"currentPositionEventId":"e1"} a chronological or roadmap sequence (3-20 events) with expandable detail and optional category filter chips; "date" is a display label so relative labels like "Month 1" work as well as real dates. Set currentPositionEventId to mark "you are here" on a forward-looking roadmap. Use this over "graph-diagram" flow whenever the sequence is fundamentally about WHEN things happen (a project plan, an algorithm update history, a client onboarding schedule) rather than a decision process.
- {"type":"card-match","title":"...","mode":"match-pairs|sequence|assemble","pairs":[{"id":"p1","left":"...","right":"..."}],"steps":[{"id":"s1","label":"...","correctPosition":0}],"pieces":[{"id":"pc1","label":"...","correct":true}],"targetLabel":"..."} one tap-to-place mechanic, three scored modes (never raw drag-and-drop). "match-pairs" links a term to its definition or a cause to its effect (3-10 pairs). "sequence" orders 3-10 steps into the one correct sequence (correctPosition must be a full permutation of 0..n-1). "assemble" (targetLabel required) asks the learner to select every piece that genuinely belongs to a target from a mixed pool of correct pieces and distractors (at least 2 correct, at least 1 distractor). Populate only the field matching "mode". Prefer this over "card-sort" when there is a genuine ORDER or ONE-TO-ONE pairing to test rather than open-ended bucketing.
  GOOD EXAMPLE (sequence): {"type":"card-match","title":"Order the steps to launch a Google Search Console verification","mode":"sequence","steps":[{"id":"a","label":"Add the site property in Search Console","correctPosition":0},{"id":"b","label":"Choose a verification method","correctPosition":1},{"id":"c","label":"Publish the verification file or DNS record","correctPosition":2},{"id":"d","label":"Confirm verification in Search Console","correctPosition":3}]}
- {"type":"whiteboard","title":"...","prompt":"...","seedNotes":[{"id":"n1","text":"...","x":20,"y":30}],"persona":"...","rubric":["..."]} a freeform canvas where the learner places and connects their own sticky notes to build a mental model, then an AI persona critiques the ACTUAL board against the rubric (scored). Use this for open-ended synthesis tasks ("map how these five channels influence each other") where there is no single correct structure, unlike card-match or framework-canvas which have one correct answer.
- {"type":"infographic","title":"...","layout":"stat-row|icon-process|comparison-strip|big-number","stats":[{"value":"...","label":"...","icon":"...","trend":"up|down|flat"}],"steps":[{"icon":"...","title":"...","detail":"..."}],"comparison":{"left":{"label":"...","points":["..."]},"right":{"label":"...","points":["..."]}},"bigNumber":{"headline":"...","value":"...","context":"..."}} a visual explainer, presentational and unscored. "stat-row" (2-6 stats) for a band of related numbers side by side. "icon-process" (3-6 steps) for a short at-a-glance process strip, lighter weight than "graph-diagram" flow (no step-through interaction, just scannable at once). "comparison-strip" for a punchy two-column bullet comparison, visually distinct from the prose-paragraph "compare" block. "big-number" for exactly one fact worth a pause: never bury a genuinely surprising or load-bearing number in a paragraph, give it its own big-number moment instead. Populate only the field matching "layout".
  GOOD EXAMPLE (big-number): {"type":"infographic","title":"Why mobile page speed matters here","layout":"big-number","bigNumber":{"headline":"Every extra second of load time on mobile","value":"~20% fewer conversions","context":"This is why the audit in the next lesson leads with Core Web Vitals, not keyword gaps."}}
- {"type":"hotspot","title":"...","scenarioMarkdown":"...","regions":[{"id":"r1","label":"...","x":10,"y":10,"width":20,"height":15,"isIssue":true,"explanation":"..."}]} a "find the mistake" exercise (4-12 regions, at least 2 real issues and at least 1 decoy) on a scene described entirely in scenarioMarkdown and structured percentage-positioned regions (no image needed). The learner taps regions they believe are problems and is scored on true positives minus false positives. Use this instead of the open-ended "scenario" block specifically when there is a concrete, checkable set of right and wrong answers to find (a broken checkout flow, a flawed campaign brief, a misconfigured tracking setup); keep "scenario" for genuinely open-ended reasoning prompts with no fixed answer key.
- {"type":"chart-xl","id":"...","title":"...","kind":"bar|stacked-bar|line|area|scatter|candlestick|pie|donut|radar|funnel|sunburst|treemap|sankey|graph|themeriver|heatmap|bubble|wordcloud|gantt","unit":"...","caption":"...","cartesian":{"categories":["..."],"series":[{"name":"...","values":[0]}]},"points":{"series":[{"name":"...","points":[{"x":0,"y":0,"size":0,"label":"..."}]}]},"candles":{"categories":["..."],"values":[[0,0,0,0]]},"parts":{"items":[{"name":"...","value":0}]},"radar":{"axes":[{"name":"...","max":100}],"series":[{"name":"...","values":[0]}]},"tree":{"nodes":[{"name":"...","value":0,"children":[]}]},"flow":{"nodes":[{"id":"a","label":"..."}],"links":[{"from":"a","to":"b","value":0}]},"river":{"series":["..."],"points":[{"date":"...","series":"...","value":0}]},"grid":{"rowLabels":["..."],"colLabels":["..."],"values":[[0]]},"tasks":{"items":[{"label":"...","start":0,"end":1,"group":"..."}]},"story":{"steps":[{"text":"...","focus":"..."}]},"probe":{"question":"...","options":[{"id":"o1","label":"...","correct":true}],"explain":"..."}} the full ECharts-backed chart catalog (TEACHING.md section 2). Populate ONLY the one payload field that matches "kind" (bar/stacked-bar/line/area -> cartesian; scatter/bubble -> points; candlestick -> candles; pie/donut/funnel/wordcloud -> parts; radar -> radar; sunburst/treemap -> tree; sankey/graph -> flow; themeriver -> river; heatmap -> grid; gantt -> tasks) and always include "caption" (the one-line takeaway) plus at least one of "story" (a progressive reveal, "focus" naming a real series/category/node/part to highlight) or "probe" (a scored question with exactly one correct option). This is the block that replaces prose numbers: the moment a lesson is about to state more than two numbers in a sentence, convert them into a chart-xl with a probe instead. PICK "kind" BY THE QUESTION THE NUMBERS ANSWER, not by variety: parts of a whole -> pie/donut; hierarchical decomposition -> sunburst; many parts, which dominate -> treemap; composition across categories -> stacked-bar; funnel loss across stages -> funnel; a value moving over time -> line; cumulative growth over time -> area; share shifting over time -> themeriver; volatility/range over time -> candlestick; compare items on one measure -> bar; compare items on many dimensions -> radar; do two variables relate -> scatter; three variables at once -> bubble; where is it hot in a 2D grid -> heatmap; where does quantity flow -> sankey; what connects to what -> graph; what words dominate -> wordcloud; when does work happen -> gantt. Use the plain "chart" block only for a trivial single-series comparison that does not need a caption/story/probe; use "chart-advanced" only for pre-existing stored lessons, never for new content.
- {"type":"flashcard-deck","id":"...","title":"...","cards":[{"id":"c1","front":"...","back":"...","tag":"..."}]} the mandatory "Retain" beat (5-30 cards) that closes EVERY lesson and feeds the spaced-repetition review queue. Cards must be APPLICATION-phrased: "front" poses a real situation or decision ("Client's blog has 300 thin tag pages. Index or noindex?"), "back" gives the decision plus the why in 1-2 sentences; at most a third of the deck may be plain definition recall. card ids only need to be unique within this deck.

Composition guideline for the extended blocks: when the concept IS a named
business or strategy framework, reach for framework-canvas or
financial-statement instead of explaining it in prose. When the concept is a
process, hierarchy, or decision tree, reach for graph-diagram instead of a
static wall of text. When a single fact in the lesson is genuinely worth
pausing on, give it an infographic big-number moment instead of letting it
sit inside a paragraph where it will be skimmed past.`;

export async function ensureLessonContent(lessonId: string): Promise<LessonContent> {
  const admin = supabaseAdmin();
  const { data: lesson, error } = await admin
    .from("lessons")
    .select(
      "id, title, content, module_id, modules(title, difficulty, summary, track_id, skill_tracks(title, slug))"
    )
    .eq("id", lessonId)
    .single();
  if (error || !lesson) throw new Error(`Lesson not found: ${lessonId}`);

  if (lesson.content) {
    const cached = lessonContentSchema.safeParse(lesson.content);
    if (cached.success) return cached.data;
  }

  const moduleInfo = lesson.modules as unknown as {
    title: string;
    difficulty: string;
    summary: string;
    skill_tracks: { title: string; slug: string };
  };
  const trackTitle = moduleInfo.skill_tracks.title;

  const sources = await research(
    `${lesson.title} ${trackTitle} how it works practical guide`,
    5
  );
  const sourceText = sources
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`)
    .join("\n\n");

  const content = await aiJson(
    lessonContentSchema,
    PROFESSOR,
    `Write the full lesson "${lesson.title}" for the module "${moduleInfo.title}"
(${moduleInfo.difficulty} level) in the "${trackTitle}" course.

Fresh research snippets (ground the lesson in these where relevant):
${sourceText || "(research unavailable; rely on well-established practice)"}

Mandatory teaching sequence inside the blocks array:
1. define the concept in plain language (text)
2. one everyday analogy (analogy)
3. one worked practical example with concrete steps (worked-example)
4. at least one interactive artifact that SHOWS the concept (flowchart, slider-sim,
   card-sort, compare, or chart; pick what fits this topic best)
5. one check for understanding (quiz)
6. IF this concept is decision-heavy or has real-world stakes (a call a
   practitioner could get wrong on the job, where the right answer only shows
   itself once you see the consequence): follow steps 1-5 with the full
   mission chain, in order, nothing interleaved between them: mission ->
   simulation (2-6 stages, honestly graded choices, at least one forward-only
   goTo branch, realistic metric deltas) -> reflection -> expert-review.
   OTHERWISE end with a scenario block the learner can discuss with the tutor.
   Do not force the mission chain onto purely factual or definitional
   concepts; use it only where a simulated decision genuinely teaches more
   than being told the answer.
7. always finish the blocks array with one flashcard-deck block (5-12
   application-phrased cards) so the lesson feeds the spaced-repetition
   review queue; this is the mandatory "Retain" beat and it is never
   skipped, whichever path steps 4-6 took.

${BLOCK_PALETTE}

Also write "intro": 1-2 sentences on why this matters on the job.
Return JSON: {"intro":"...","blocks":[...]}`,
    `lesson/${lessonId.slice(0, 8)}`
  );

  const { error: updateErr } = await admin
    .from("lessons")
    .update({ content })
    .eq("id", lessonId);
  if (updateErr) {
    await reportEvent(
      "error",
      "curriculum",
      `Lesson content save failed for ${lessonId}: ${updateErr.message}`
    );
  }
  return content;
}
