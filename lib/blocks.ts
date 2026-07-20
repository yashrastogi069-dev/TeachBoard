import { z } from "zod";

/*
  The Interactive Artifact Engine contract (AGENTS.md rule 7).
  The AI emits lesson content as an array of these blocks; the renderer in
  components/artifacts maps each type to a hand-built component. Interactive
  blocks (quiz, card-sort) report scores that feed lesson mastery.
*/

export const textBlock = z.object({
  type: z.literal("text"),
  markdown: z.string().min(1),
});

export const analogyBlock = z.object({
  type: z.literal("analogy"),
  title: z.string().min(1),
  markdown: z.string().min(1),
});

export const workedExampleBlock = z.object({
  type: z.literal("worked-example"),
  title: z.string().min(1),
  markdown: z.string().min(1),
});

export const flowchartBlock = z.object({
  type: z.literal("flowchart"),
  title: z.string().min(1),
  nodes: z
    .array(z.object({ id: z.string().min(1), label: z.string().min(1) }))
    .min(2)
    .max(10),
  edges: z
    .array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        label: z.string().optional(),
      })
    )
    .min(1),
});

export const quizBlock = z.object({
  type: z.literal("quiz"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5),
  correctIndex: z.number().int().min(0),
  explanation: z.string().min(1),
});

export const cardSortBlock = z.object({
  type: z.literal("card-sort"),
  title: z.string().min(1),
  buckets: z
    .array(z.object({ id: z.string().min(1), label: z.string().min(1) }))
    .min(2)
    .max(4),
  cards: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        bucketId: z.string().min(1),
      })
    )
    .min(3)
    .max(10),
});

export const sliderSimBlock = z.object({
  type: z.literal("slider-sim"),
  title: z.string().min(1),
  description: z.string().min(1),
  inputLabel: z.string().min(1),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  unit: z.string().default(""),
  outputs: z
    .array(
      z.object({
        label: z.string().min(1),
        unit: z.string().default(""),
        base: z.number(),
        factor: z.number(),
      })
    )
    .min(1)
    .max(3),
});

export const compareBlock = z.object({
  type: z.literal("compare"),
  title: z.string().min(1),
  goodLabel: z.string().min(1),
  badLabel: z.string().min(1),
  goodMarkdown: z.string().min(1),
  badMarkdown: z.string().min(1),
});

export const chartBlock = z.object({
  type: z.literal("chart"),
  title: z.string().min(1),
  unit: z.string().default(""),
  series: z
    .array(z.object({ label: z.string().min(1), value: z.number() }))
    .min(2)
    .max(8),
});

export const videoBlock = z.object({
  type: z.literal("video"),
  title: z.string().min(1),
  searchQuery: z.string().min(1),
  url: z.string().url().optional(),
});

export const scenarioBlock = z.object({
  type: z.literal("scenario"),
  prompt: z.string().min(1),
  hint: z.string().min(1),
});

/*
  Hierarchical concept map: a root idea that branches into parts, each part
  expandable to reveal its detail. Two levels below the root keeps it
  readable on mobile.
*/
const treeLeaf = z.object({
  label: z.string().min(1),
  detail: z.string().min(1),
});
export const treeMapBlock = z.object({
  type: z.literal("tree-map"),
  title: z.string().min(1),
  root: z.object({
    label: z.string().min(1),
    children: z
      .array(
        z.object({
          label: z.string().min(1),
          detail: z.string().min(1),
          children: z.array(treeLeaf).max(5).optional(),
        })
      )
      .min(2)
      .max(6),
  }),
});

/*
  Simulated console walkthrough: the learner steps through real commands
  (terminal, SQL, robots.txt fetches, API calls) one at a time and sees the
  output plus why it matters. No real execution; the value is reading real
  tool output safely.
*/
export const terminalSimBlock = z.object({
  type: z.literal("terminal-sim"),
  title: z.string().min(1),
  description: z.string().min(1),
  steps: z
    .array(
      z.object({
        command: z.string().min(1),
        output: z.string().min(1),
        note: z.string().optional(),
      })
    )
    .min(2)
    .max(8),
});

/*
  Mission chain (AGENTS.md learning-by-doing mandate). A concept becomes a
  playable experience: mission framing -> branching simulation with visible
  consequences -> reflection -> AI expert review of the actual decision path.
  The four blocks below are designed to appear together, in that order.
*/

export const missionBlock = z.object({
  type: z.literal("mission"),
  title: z.string().min(1),
  role: z.string().min(1), // who the learner becomes ("You are the new SEO lead at...")
  stakes: z.string().min(1), // what is at risk if they fail
  objective: z.string().min(1), // plain-language win condition
  constraints: z
    .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
    .min(1)
    .max(4),
  briefing: z.string().min(1), // markdown scene-setting
});

const simMetric = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().default(""),
  start: z.number(),
  goal: z.number().optional(),
  higherIsBetter: z.boolean().default(true),
});

const simEffect = z.object({
  metricId: z.string().min(1),
  delta: z.number(),
});

const simChoice = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  quality: z.enum(["best", "good", "poor"]),
  feedback: z.string().min(1), // immediate consequence narration
  effects: z.array(simEffect).min(1).max(4),
  goTo: z.string().optional(), // forward-only branch target; default is the next stage
});

const simStage = z.object({
  id: z.string().min(1),
  situation: z.string().min(1), // markdown: what is happening right now
  choices: z.array(simChoice).min(2).max(4),
});

export const simulationBlock = z.object({
  type: z.literal("simulation"),
  title: z.string().min(1),
  metrics: z.array(simMetric).min(1).max(4),
  stages: z.array(simStage).min(2).max(6),
  debrief: z.string().min(1), // markdown shown after the final stage
});

/*
  z.discriminatedUnion cannot accept a ZodEffects member, so simulationBlock
  above stays a plain object schema and this function carries the reference
  checks that used to live in a .superRefine on the block itself. It returns
  every problem found (unknown metric refs, unknown/backward goTo targets) as
  plain strings, empty when the simulation is valid. lessonContentSchema below
  calls this to reject broken simulations with the same message wording.
*/
export function validateSimulationRefs(sim: z.infer<typeof simulationBlock>): string[] {
  const problems: string[] = [];
  const metricIds = new Set(sim.metrics.map((m) => m.id));
  const stageIndex = new Map(sim.stages.map((s, i) => [s.id, i]));
  sim.stages.forEach((stage, i) => {
    stage.choices.forEach((choice) => {
      choice.effects.forEach((e) => {
        if (!metricIds.has(e.metricId)) {
          problems.push(
            `stage "${stage.id}" choice "${choice.id}" references unknown metric "${e.metricId}"`
          );
        }
      });
      if (choice.goTo !== undefined) {
        const target = stageIndex.get(choice.goTo);
        if (target === undefined) {
          problems.push(
            `stage "${stage.id}" choice "${choice.id}" branches to unknown stage "${choice.goTo}"`
          );
        } else if (target <= i) {
          // forward-only branching guarantees the simulation always terminates
          problems.push(
            `stage "${stage.id}" choice "${choice.id}" must branch forward, not to stage ${target}`
          );
        }
      }
    });
  });
  return problems;
}

export const reflectionBlock = z.object({
  type: z.literal("reflection"),
  prompt: z.string().min(1), // "Why did the client churn after your second decision?"
  guidance: z.string().min(1), // what a strong reflection covers
});

export const expertReviewBlock = z.object({
  type: z.literal("expert-review"),
  title: z.string().min(1),
  persona: z.string().min(1), // "Senior SEO consultant, 12 years agency-side"
  rubric: z.array(z.string().min(1)).min(2).max(5),
});

/*
  Iteration 3 (PLAN.md "Artifact catalog v2"): a large wishlist of 25+ example
  interactions collapses into 7 flexible schema families rather than one
  bespoke component per example. Each family below follows the same pattern
  as simulationBlock above: the block itself stays a plain z.object so it can
  live inside the discriminatedUnion, and any cross-field reference check
  that would otherwise need .superRefine lives in a validateXRefs(block)
  helper wired into lessonContentSchema's superRefine.
*/

/*
  A. graph-diagram: one node/edge engine reused for three visual treatments
  ("flow" for animated step-through process diagrams and value chains, "tree"
  for decision trees / knowledge graphs / org charts with a rootId anchor,
  "network" for relationship maps laid out with a deterministic repulsion
  pass). The renderer picks the visual treatment from layout; the data shape
  is identical across all three.
*/
const graphNode = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().optional(),
});

const graphEdge = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

export const graphDiagramBlock = z.object({
  type: z.literal("graph-diagram"),
  title: z.string().min(1),
  layout: z.enum(["flow", "tree", "network"]),
  nodes: z.array(graphNode).min(2).max(24),
  edges: z.array(graphEdge).min(1),
  rootId: z.string().min(1).optional(), // only meaningful (and required) when layout is "tree"
});

/*
  Checks edge references and, for layout "tree", that rootId names a real
  node and that the edges reachable from it form an actual tree: no cycles,
  and every node reachable (nothing orphaned off to the side). Edges are
  read as parent -> child (from -> to) when building the tree.
*/
export function validateGraphDiagramRefs(block: z.infer<typeof graphDiagramBlock>): string[] {
  const problems: string[] = [];
  const nodeIds = new Set(block.nodes.map((n) => n.id));
  block.edges.forEach((edge, i) => {
    if (!nodeIds.has(edge.from)) {
      problems.push(`edge ${i} references unknown source node "${edge.from}"`);
    }
    if (!nodeIds.has(edge.to)) {
      problems.push(`edge ${i} references unknown target node "${edge.to}"`);
    }
  });

  if (block.layout === "tree") {
    if (!block.rootId || !nodeIds.has(block.rootId)) {
      problems.push(`tree layout requires rootId to reference a real node`);
      return problems;
    }
    const children = new Map<string, string[]>();
    block.edges.forEach((e) => {
      if (!children.has(e.from)) children.set(e.from, []);
      children.get(e.from)!.push(e.to);
    });
    const visited = new Set<string>();
    const inStack = new Set<string>();
    let cycleFound = false;
    function visit(id: string) {
      if (inStack.has(id)) {
        cycleFound = true;
        return;
      }
      if (visited.has(id)) return;
      visited.add(id);
      inStack.add(id);
      (children.get(id) ?? []).forEach(visit);
      inStack.delete(id);
    }
    visit(block.rootId);
    if (cycleFound) {
      problems.push(`tree layout contains a cycle reachable from rootId "${block.rootId}"`);
    }
    const unreachable = block.nodes.filter((n) => !visited.has(n.id));
    if (unreachable.length > 0) {
      problems.push(
        `tree layout has node(s) unreachable from rootId "${block.rootId}": ${unreachable
          .map((n) => n.id)
          .join(", ")}`
      );
    }
  }

  return problems;
}

/*
  B. framework-canvas: a configurable grid of labelled cells. `framework`
  picks the built-in grid geometry the renderer draws (2x2 SWOT, 5-zone
  Porter's Five Forces, 6-cell PESTEL, 9-block Business Model Canvas, or any
  layout under "custom"). Two modes: "presented" shows a worked example with
  every cell already filled; "drafted" starts every cell empty for the
  learner to fill, then compares their answer against modelAnswer cell by
  cell (reusing the expert-review critique pattern).
*/
const canvasCell = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  content: z.string().default(""), // presented mode: the worked answer; drafted mode: learner fills this in
  accent: z.string().optional(),
});

export const frameworkCanvasBlock = z.object({
  type: z.literal("framework-canvas"),
  title: z.string().min(1),
  framework: z.enum(["custom", "swot", "porters-five-forces", "pestel", "business-model-canvas"]),
  mode: z.enum(["presented", "drafted"]),
  cells: z.array(canvasCell).min(2).max(12),
  modelAnswer: z.array(z.object({ cellId: z.string().min(1), content: z.string().min(1) })).optional(),
});

/*
  Presented mode must actually show something in every cell (no empty
  "worked example" cells). Drafted mode must ship a modelAnswer for the
  compare-after step, and every modelAnswer entry must point at a real cell.
*/
export function validateFrameworkCanvasRefs(
  block: z.infer<typeof frameworkCanvasBlock>
): string[] {
  const problems: string[] = [];
  const cellIds = new Set(block.cells.map((c) => c.id));

  if (block.mode === "presented") {
    block.cells.forEach((cell) => {
      if (cell.content.trim().length === 0) {
        problems.push(`presented mode cell "${cell.id}" must have content`);
      }
    });
  }

  if (block.mode === "drafted" && (!block.modelAnswer || block.modelAnswer.length === 0)) {
    problems.push(`drafted mode requires a modelAnswer for the compare-after step`);
  }

  (block.modelAnswer ?? []).forEach((answer, i) => {
    if (!cellIds.has(answer.cellId)) {
      problems.push(`modelAnswer ${i} references unknown cell "${answer.cellId}"`);
    }
  });

  return problems;
}

/*
  C. financial-statement: a line-item statement (P&L / balance sheet / cash
  flow) with an optional "what-if" driver per assumption. A driver mirrors
  slider-sim's base+factor math but the driver's own moved value stands in
  for "base": moving driver value V recalculates every affected line item as
  V * factor (e.g. a "units sold" driver at 1,200 with factor 45 recalculates
  a revenue line to 1,200 * 45 = 54,000), so the learner watches a single
  assumption ripple through the real numbers.
*/
const lineItem = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  indent: z.number().int().min(0).max(3).default(0),
  isTotal: z.boolean().default(false),
});

const financialDriver = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  unit: z.string().default(""),
  affects: z.array(z.object({ lineItemId: z.string().min(1), factor: z.number() })).min(1),
});

export const financialStatementBlock = z.object({
  type: z.literal("financial-statement"),
  title: z.string().min(1),
  statementType: z.enum(["income-statement", "balance-sheet", "cash-flow"]),
  lineItems: z.array(lineItem).min(3),
  drivers: z.array(financialDriver).max(3).optional(),
});

export function validateFinancialStatementRefs(
  block: z.infer<typeof financialStatementBlock>
): string[] {
  const problems: string[] = [];
  const lineItemIds = new Set(block.lineItems.map((li) => li.id));
  (block.drivers ?? []).forEach((driver) => {
    driver.affects.forEach((a) => {
      if (!lineItemIds.has(a.lineItemId)) {
        problems.push(`driver "${driver.id}" affects unknown line item "${a.lineItemId}"`);
      }
    });
  });
  return problems;
}

/*
  D. chart-advanced: extends the existing no-dependency chart block with
  three magnitude-based variants that treemap/timeline do not cover. Exactly
  one payload field is populated depending on `variant`; the others stay
  undefined. All rendering stays hand-built SVG, no new chart library.
*/
const bubblePoint = z.object({
  label: z.string().min(1),
  x: z.number(),
  y: z.number(),
  size: z.number().nonnegative(),
});

const heatmapGrid = z.object({
  rowLabels: z.array(z.string().min(1)).min(1),
  colLabels: z.array(z.string().min(1)).min(1),
  values: z.array(z.array(z.number())).min(1),
});

const sankeyFlow = z.object({
  nodes: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(2),
  links: z
    .array(z.object({ from: z.string().min(1), to: z.string().min(1), value: z.number().positive() }))
    .min(1),
});

export const chartAdvancedBlock = z.object({
  type: z.literal("chart-advanced"),
  title: z.string().min(1),
  variant: z.enum(["bubble", "heatmap", "sankey"]),
  unit: z.string().default(""),
  bubblePoints: z.array(bubblePoint).optional(),
  heatmapGrid: heatmapGrid.optional(),
  sankeyFlow: sankeyFlow.optional(),
});

export function validateChartAdvancedRefs(block: z.infer<typeof chartAdvancedBlock>): string[] {
  const problems: string[] = [];

  if (block.variant === "bubble") {
    if (!block.bubblePoints || block.bubblePoints.length < 2) {
      problems.push(`bubble variant requires at least 2 bubblePoints`);
    }
  } else if (block.variant === "heatmap") {
    if (!block.heatmapGrid) {
      problems.push(`heatmap variant requires heatmapGrid`);
    } else {
      const { rowLabels, colLabels, values } = block.heatmapGrid;
      if (values.length !== rowLabels.length) {
        problems.push(
          `heatmapGrid has ${values.length} value row(s) but ${rowLabels.length} rowLabel(s)`
        );
      }
      values.forEach((row, i) => {
        if (row.length !== colLabels.length) {
          problems.push(
            `heatmapGrid row ${i} has ${row.length} value(s) but there are ${colLabels.length} colLabel(s)`
          );
        }
      });
    }
  } else if (block.variant === "sankey") {
    if (!block.sankeyFlow || block.sankeyFlow.links.length < 1) {
      problems.push(`sankey variant requires sankeyFlow with at least 1 link`);
    } else {
      const nodeIds = new Set(block.sankeyFlow.nodes.map((n) => n.id));
      block.sankeyFlow.links.forEach((link, i) => {
        if (!nodeIds.has(link.from)) {
          problems.push(`sankeyFlow link ${i} references unknown node "${link.from}"`);
        }
        if (!nodeIds.has(link.to)) {
          problems.push(`sankeyFlow link ${i} references unknown node "${link.to}"`);
        }
      });
    }
  }

  return problems;
}

/*
  E. timeline: chronological events with expandable detail, optional
  category filter chips, and an optional "current position" marker so a
  roadmap can show where the learner's hypothetical project stands today.
  date is a display label, not a strict ISO date, since lessons need
  relative labels like "Month 1" as often as calendar dates.
*/
const timelineEvent = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  category: z.string().optional(),
});

export const timelineBlock = z.object({
  type: z.literal("timeline"),
  title: z.string().min(1),
  events: z.array(timelineEvent).min(3).max(20),
  categories: z.array(z.string().min(1)).optional(),
  currentPositionEventId: z.string().optional(),
});

export function validateTimelineRefs(block: z.infer<typeof timelineBlock>): string[] {
  const problems: string[] = [];
  if (block.currentPositionEventId) {
    const eventIds = new Set(block.events.map((e) => e.id));
    if (!eventIds.has(block.currentPositionEventId)) {
      problems.push(
        `currentPositionEventId "${block.currentPositionEventId}" does not reference a real event`
      );
    }
  }
  return problems;
}

/*
  F. card-match: one tap-to-place mechanic (never raw drag-and-drop, per the
  existing accessibility decision) covering three modes. Exactly one of
  pairs/steps/pieces applies depending on mode; the others must be absent,
  the same "mode gates which fields are legal" pattern used by
  framework-canvas above.
*/
const matchPair = z.object({
  id: z.string().min(1),
  left: z.string().min(1),
  right: z.string().min(1),
});

const sequenceStep = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  correctPosition: z.number().int().min(0), // 0-indexed slot this step belongs in
});

const assemblePiece = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  correct: z.boolean(), // true if this piece genuinely belongs in the target, false if it is a distractor
});

export const cardMatchBlock = z.object({
  type: z.literal("card-match"),
  title: z.string().min(1),
  mode: z.enum(["match-pairs", "sequence", "assemble"]),
  pairs: z.array(matchPair).min(3).max(10).optional(),
  steps: z.array(sequenceStep).min(3).max(10).optional(),
  pieces: z.array(assemblePiece).min(4).max(12).optional(),
  targetLabel: z.string().optional(), // required for "assemble": what the pieces build toward
});

export function validateCardMatchRefs(block: z.infer<typeof cardMatchBlock>): string[] {
  const problems: string[] = [];
  const hasPairs = block.pairs !== undefined;
  const hasSteps = block.steps !== undefined;
  const hasPieces = block.pieces !== undefined;

  if (block.mode === "match-pairs") {
    if (!hasPairs) problems.push(`match-pairs mode requires pairs`);
    if (hasSteps) problems.push(`match-pairs mode must not include steps`);
    if (hasPieces) problems.push(`match-pairs mode must not include pieces`);
  } else if (block.mode === "sequence") {
    if (!hasSteps) problems.push(`sequence mode requires steps`);
    if (hasPairs) problems.push(`sequence mode must not include pairs`);
    if (hasPieces) problems.push(`sequence mode must not include pieces`);
    if (block.steps) {
      const n = block.steps.length;
      const positions = block.steps.map((s) => s.correctPosition).slice().sort((a, b) => a - b);
      const expected = Array.from({ length: n }, (_, i) => i);
      const isPermutation =
        positions.length === expected.length && positions.every((v, i) => v === expected[i]);
      if (!isPermutation) {
        problems.push(`sequence correctPosition values must form a permutation of 0..${n - 1}`);
      }
    }
  } else if (block.mode === "assemble") {
    if (!hasPieces) problems.push(`assemble mode requires pieces`);
    if (hasPairs) problems.push(`assemble mode must not include pairs`);
    if (hasSteps) problems.push(`assemble mode must not include steps`);
    if (!block.targetLabel) problems.push(`assemble mode requires targetLabel`);
    if (block.pieces) {
      const correctCount = block.pieces.filter((p) => p.correct).length;
      const distractorCount = block.pieces.length - correctCount;
      if (correctCount < 2) problems.push(`assemble mode requires at least 2 correct pieces`);
      if (distractorCount < 1) problems.push(`assemble mode requires at least 1 distractor piece`);
    }
  }

  return problems;
}

/*
  G. whiteboard: a freeform canvas where the learner places sticky notes
  (seedNotes optionally scaffolds a starting layout) to build their own
  mental model of a concept. Placement is percentage-based (0-100 on each
  axis) so the canvas scales to any viewport. persona + rubric feed the
  /api/mission whiteboard-review action, the same AI-critique shape as
  expert-review, run against the learner's actual note/connection graph.
*/
const whiteboardNote = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const whiteboardBlock = z.object({
  type: z.literal("whiteboard"),
  title: z.string().min(1),
  prompt: z.string().min(1),
  seedNotes: z.array(whiteboardNote).optional(),
  persona: z.string().min(1),
  rubric: z.array(z.string().min(1)).min(2).max(5),
});

/*
  H. infographic: a single-scroll visual explainer, distinct from
  framework-canvas (a fixed analytical grid). layout picks which single
  payload field is populated; the other three stay undefined, the same
  "mode gates which fields are legal" pattern used by card-match and
  framework-canvas above.
*/
const infographicStat = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().optional(),
  trend: z.enum(["up", "down", "flat"]).optional(),
});

const infographicStep = z.object({
  icon: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
});

const infographicComparisonSide = z.object({
  label: z.string().min(1),
  points: z.array(z.string().min(1)).min(2).max(6),
});

const infographicBigNumber = z.object({
  headline: z.string().min(1),
  value: z.string().min(1),
  context: z.string().min(1),
});

export const infographicBlock = z.object({
  type: z.literal("infographic"),
  title: z.string().min(1),
  layout: z.enum(["stat-row", "icon-process", "comparison-strip", "big-number"]),
  stats: z.array(infographicStat).min(2).max(6).optional(), // required for "stat-row"
  steps: z.array(infographicStep).min(3).max(6).optional(), // required for "icon-process"
  comparison: z
    .object({ left: infographicComparisonSide, right: infographicComparisonSide })
    .optional(), // required for "comparison-strip"
  bigNumber: infographicBigNumber.optional(), // required for "big-number"
});

/*
  Require-one-forbid-others per layout, mirroring validateCardMatchRefs: the
  field matching `layout` must be present, and the other three must be
  absent, so an AI-authored block cannot ship a stray unused payload.
*/
export function validateInfographicRefs(block: z.infer<typeof infographicBlock>): string[] {
  const problems: string[] = [];
  const hasStats = block.stats !== undefined;
  const hasSteps = block.steps !== undefined;
  const hasComparison = block.comparison !== undefined;
  const hasBigNumber = block.bigNumber !== undefined;

  if (block.layout === "stat-row") {
    if (!hasStats) problems.push(`stat-row layout requires stats`);
    if (hasSteps) problems.push(`stat-row layout must not include steps`);
    if (hasComparison) problems.push(`stat-row layout must not include comparison`);
    if (hasBigNumber) problems.push(`stat-row layout must not include bigNumber`);
  } else if (block.layout === "icon-process") {
    if (!hasSteps) problems.push(`icon-process layout requires steps`);
    if (hasStats) problems.push(`icon-process layout must not include stats`);
    if (hasComparison) problems.push(`icon-process layout must not include comparison`);
    if (hasBigNumber) problems.push(`icon-process layout must not include bigNumber`);
  } else if (block.layout === "comparison-strip") {
    if (!hasComparison) problems.push(`comparison-strip layout requires comparison`);
    if (hasStats) problems.push(`comparison-strip layout must not include stats`);
    if (hasSteps) problems.push(`comparison-strip layout must not include steps`);
    if (hasBigNumber) problems.push(`comparison-strip layout must not include bigNumber`);
  } else if (block.layout === "big-number") {
    if (!hasBigNumber) problems.push(`big-number layout requires bigNumber`);
    if (hasStats) problems.push(`big-number layout must not include stats`);
    if (hasSteps) problems.push(`big-number layout must not include steps`);
    if (hasComparison) problems.push(`big-number layout must not include comparison`);
  }

  return problems;
}

/*
  I. hotspot: "find the N problems" on a rendered scene. The scene is
  described as structured percentage-positioned regions (imageless render
  mode) so it stays text-buildable by the AI, no screenshot required. The
  learner taps regions they believe are issues; scoreHotspot below rewards
  true positives and penalizes false positives, the same clamped formula
  shape as scoreCardMatch's assemble mode.
*/
const hotspotRegion = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100),
  height: z.number().min(0).max(100),
  isIssue: z.boolean(),
  explanation: z.string().min(1),
});

export const hotspotBlock = z.object({
  type: z.literal("hotspot"),
  title: z.string().min(1),
  scenarioMarkdown: z.string().min(1),
  regions: z.array(hotspotRegion).min(4).max(12),
});

/*
  Requires at least 2 real issues to find and at least 1 decoy (isIssue
  false), mirroring validateCardMatchRefs's assemble-mode piece-count check.
*/
export function validateHotspotRefs(block: z.infer<typeof hotspotBlock>): string[] {
  const problems: string[] = [];
  const issueCount = block.regions.filter((r) => r.isIssue).length;
  const decoyCount = block.regions.length - issueCount;
  if (issueCount < 2) problems.push(`hotspot requires at least 2 regions with isIssue true`);
  if (decoyCount < 1) problems.push(`hotspot requires at least 1 decoy region with isIssue false`);
  return problems;
}

/*
  J. chart-xl (TEACHING.md section 2, "Chart Catalog XL"): the full ECharts-
  backed catalog rendered by components/artifacts/ChartXLBlock.tsx (batch
  X2). Exactly one payload field is populated depending on `kind`, the same
  "mode gates which fields are legal" pattern used by chart-advanced,
  card-match, and infographic above. `caption` is always required (no
  decorative charts) and at least one playable layer -- `story` (a
  progressive-reveal walkthrough) or `probe` (a scored question) -- must be
  present; that density rule is enforced in validateChartXlRefs below since
  chartXlBlock itself must stay a plain z.object to sit inside the
  discriminated union.
*/
export type ChartXlTreeNode = {
  name: string;
  value?: number;
  children?: ChartXlTreeNode[];
};

const chartXlTreeNode: z.ZodType<ChartXlTreeNode> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    value: z.number().optional(),
    children: z.array(chartXlTreeNode).optional(),
  })
);

const chartXlKind = z.enum([
  "bar",
  "stacked-bar",
  "line",
  "area",
  "scatter",
  "candlestick",
  "pie",
  "donut",
  "radar",
  "funnel",
  "sunburst",
  "treemap",
  "sankey",
  "graph",
  "themeriver",
  "heatmap",
  "bubble",
  "wordcloud",
  "gantt",
]);

const chartXlCartesian = z.object({
  categories: z.array(z.string().min(1)).min(2).max(24),
  series: z
    .array(z.object({ name: z.string().min(1), values: z.array(z.number()) }))
    .min(1)
    .max(6),
});

const chartXlPoints = z.object({
  series: z
    .array(
      z.object({
        name: z.string().min(1),
        points: z
          .array(
            z.object({
              x: z.number(),
              y: z.number(),
              size: z.number().nonnegative().optional(),
              label: z.string().optional(),
            })
          )
          .min(1),
      })
    )
    .min(1),
});

const chartXlCandles = z.object({
  categories: z.array(z.string().min(1)).min(2),
  values: z.array(z.tuple([z.number(), z.number(), z.number(), z.number()])).min(1),
});

const chartXlParts = z.object({
  items: z.array(z.object({ name: z.string().min(1), value: z.number() })).min(2).max(40),
});

const chartXlRadar = z.object({
  axes: z.array(z.object({ name: z.string().min(1), max: z.number() })).min(3).max(8),
  series: z
    .array(z.object({ name: z.string().min(1), values: z.array(z.number()) }))
    .min(1)
    .max(3),
});

const chartXlTree = z.object({
  nodes: z.array(chartXlTreeNode).min(1),
});

const chartXlFlow = z.object({
  nodes: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(2).max(30),
  links: z
    .array(z.object({ from: z.string().min(1), to: z.string().min(1), value: z.number() }))
    .min(1),
});

const chartXlRiver = z.object({
  series: z.array(z.string().min(1)).min(2).max(6),
  points: z
    .array(z.object({ date: z.string().min(1), series: z.string().min(1), value: z.number() }))
    .min(1),
});

const chartXlGrid = z.object({
  rowLabels: z.array(z.string().min(1)).min(1),
  colLabels: z.array(z.string().min(1)).min(1),
  values: z.array(z.array(z.number())).min(1),
});

const chartXlTasks = z.object({
  items: z
    .array(
      z.object({
        label: z.string().min(1),
        start: z.number(),
        end: z.number(),
        group: z.string().optional(),
      })
    )
    .min(1),
});

const chartXlStory = z.object({
  steps: z.array(z.object({ text: z.string().min(1), focus: z.string().optional() })).min(1).max(6),
});

const chartXlProbe = z.object({
  question: z.string().min(1),
  options: z
    .array(z.object({ id: z.string().min(1), label: z.string().min(1), correct: z.boolean() }))
    .min(2)
    .max(5),
  explain: z.string().min(1),
});

export const chartXlBlock = z.object({
  type: z.literal("chart-xl"),
  id: z.string().min(1),
  title: z.string().min(1),
  kind: chartXlKind,
  unit: z.string().default(""),
  caption: z.string().min(1),
  cartesian: chartXlCartesian.optional(),
  points: chartXlPoints.optional(),
  candles: chartXlCandles.optional(),
  parts: chartXlParts.optional(),
  radar: chartXlRadar.optional(),
  tree: chartXlTree.optional(),
  flow: chartXlFlow.optional(),
  river: chartXlRiver.optional(),
  grid: chartXlGrid.optional(),
  tasks: chartXlTasks.optional(),
  story: chartXlStory.optional(),
  probe: chartXlProbe.optional(),
});

/* kind -> the single payload field that kind is allowed to populate. */
const CHART_XL_PAYLOAD_BY_KIND: Record<z.infer<typeof chartXlKind>, string> = {
  bar: "cartesian",
  "stacked-bar": "cartesian",
  line: "cartesian",
  area: "cartesian",
  scatter: "points",
  bubble: "points",
  candlestick: "candles",
  pie: "parts",
  donut: "parts",
  funnel: "parts",
  wordcloud: "parts",
  radar: "radar",
  sunburst: "tree",
  treemap: "tree",
  sankey: "flow",
  graph: "flow",
  themeriver: "river",
  heatmap: "grid",
  gantt: "tasks",
};

const CHART_XL_PAYLOAD_KEYS = [
  "cartesian",
  "points",
  "candles",
  "parts",
  "radar",
  "tree",
  "flow",
  "river",
  "grid",
  "tasks",
] as const;

/*
  Every name a story.focus can legitimately point at for the block's
  populated payload: series names, category labels, node ids/labels, part
  names, axis names, or grid row/col labels, depending on which payload is
  in play.
*/
function chartXlFocusTargets(block: z.infer<typeof chartXlBlock>): Set<string> {
  const targets = new Set<string>();
  if (block.cartesian) {
    block.cartesian.categories.forEach((c) => targets.add(c));
    block.cartesian.series.forEach((s) => targets.add(s.name));
  }
  if (block.points) {
    block.points.series.forEach((s) => targets.add(s.name));
  }
  if (block.candles) {
    block.candles.categories.forEach((c) => targets.add(c));
  }
  if (block.parts) {
    block.parts.items.forEach((i) => targets.add(i.name));
  }
  if (block.radar) {
    block.radar.axes.forEach((a) => targets.add(a.name));
    block.radar.series.forEach((s) => targets.add(s.name));
  }
  if (block.tree) {
    const walk = (nodes: ChartXlTreeNode[]) => {
      nodes.forEach((n) => {
        targets.add(n.name);
        if (n.children) walk(n.children);
      });
    };
    walk(block.tree.nodes);
  }
  if (block.flow) {
    block.flow.nodes.forEach((n) => {
      targets.add(n.id);
      targets.add(n.label);
    });
  }
  if (block.river) {
    block.river.series.forEach((s) => targets.add(s));
  }
  if (block.grid) {
    block.grid.rowLabels.forEach((r) => targets.add(r));
    block.grid.colLabels.forEach((c) => targets.add(c));
  }
  if (block.tasks) {
    block.tasks.items.forEach((i) => targets.add(i.label));
  }
  return targets;
}

function chartXlTreeDepth(nodes: ChartXlTreeNode[], depth: number): number {
  return nodes.reduce(
    (max, n) => Math.max(max, n.children && n.children.length > 0 ? chartXlTreeDepth(n.children, depth + 1) : depth),
    depth
  );
}

/*
  Implements every check in TEACHING.md's validateChartXlRefs spec: the
  payload matching `kind` is present and every other payload is absent,
  length-matching within cartesian/candles/radar/grid, flow link resolution
  (with sankey banning self-links), river series membership, gantt
  end > start, story.focus resolving to a real payload name, probe having
  exactly one correct option, and story-or-probe being required.
*/
export function validateChartXlRefs(block: z.infer<typeof chartXlBlock>): string[] {
  const problems: string[] = [];
  const expectedPayload = CHART_XL_PAYLOAD_BY_KIND[block.kind];

  CHART_XL_PAYLOAD_KEYS.forEach((key) => {
    const present = block[key] !== undefined;
    if (key === expectedPayload && !present) {
      problems.push(`kind "${block.kind}" requires the "${key}" payload`);
    } else if (key !== expectedPayload && present) {
      problems.push(`kind "${block.kind}" must not include the "${key}" payload (only "${expectedPayload}" is allowed)`);
    }
  });

  if (block.cartesian && expectedPayload === "cartesian") {
    const { categories, series } = block.cartesian;
    series.forEach((s) => {
      if (s.values.length !== categories.length) {
        problems.push(
          `cartesian series "${s.name}" has ${s.values.length} value(s) but there are ${categories.length} categories`
        );
      }
    });
  }

  if (block.candles && expectedPayload === "candles") {
    if (block.candles.values.length !== block.candles.categories.length) {
      problems.push(
        `candles has ${block.candles.values.length} value row(s) but ${block.candles.categories.length} categories`
      );
    }
  }

  if (block.radar && expectedPayload === "radar") {
    const axesCount = block.radar.axes.length;
    block.radar.series.forEach((s) => {
      if (s.values.length !== axesCount) {
        problems.push(
          `radar series "${s.name}" has ${s.values.length} value(s) but there are ${axesCount} axes`
        );
      }
    });
  }

  if (block.grid && expectedPayload === "grid") {
    const { rowLabels, colLabels, values } = block.grid;
    if (values.length !== rowLabels.length) {
      problems.push(`grid has ${values.length} value row(s) but ${rowLabels.length} rowLabel(s)`);
    }
    values.forEach((row, i) => {
      if (row.length !== colLabels.length) {
        problems.push(`grid row ${i} has ${row.length} value(s) but there are ${colLabels.length} colLabel(s)`);
      }
    });
  }

  if (block.flow && expectedPayload === "flow") {
    const nodeIds = new Set(block.flow.nodes.map((n) => n.id));
    block.flow.links.forEach((link, i) => {
      if (!nodeIds.has(link.from)) {
        problems.push(`flow link ${i} references unknown node "${link.from}"`);
      }
      if (!nodeIds.has(link.to)) {
        problems.push(`flow link ${i} references unknown node "${link.to}"`);
      }
      if (block.kind === "sankey" && link.from === link.to) {
        problems.push(`sankey flow link ${i} is a self-link ("${link.from}" to itself), which is not allowed`);
      }
    });
  }

  if (block.river && expectedPayload === "river") {
    const seriesNames = new Set(block.river.series);
    block.river.points.forEach((p, i) => {
      if (!seriesNames.has(p.series)) {
        problems.push(`river point ${i} references unknown series "${p.series}"`);
      }
    });
  }

  if (block.tasks && expectedPayload === "tasks") {
    block.tasks.items.forEach((item, i) => {
      if (!(item.end > item.start)) {
        problems.push(`tasks item ${i} ("${item.label}") must have end > start`);
      }
    });
  }

  if (block.tree && expectedPayload === "tree") {
    const depth = chartXlTreeDepth(block.tree.nodes, 1);
    if (depth > 4) {
      problems.push(`tree payload nesting depth is ${depth}, must be at most 4`);
    }
  }

  if (block.story) {
    const targets = chartXlFocusTargets(block);
    block.story.steps.forEach((step, i) => {
      if (step.focus !== undefined && !targets.has(step.focus)) {
        problems.push(
          `story step ${i} focus "${step.focus}" does not resolve to a real series, category, node, or part name`
        );
      }
    });
  }

  if (block.probe) {
    const correctCount = block.probe.options.filter((o) => o.correct).length;
    if (correctCount !== 1) {
      problems.push(`probe must have exactly one option with correct true (found ${correctCount})`);
    }
  }

  if (!block.story && !block.probe) {
    problems.push(`chart-xl requires at least one of "story" or "probe"`);
  }

  return problems;
}

/*
  K. flashcard-deck (TEACHING.md section 4): the "Retain" beat that closes
  every lesson, feeding the SM-2-lite spaced-repetition queue persisted in
  supabase/migrations/0003_review_state.sql. Cards are application-phrased
  ("Client's blog has 300 thin tag pages. Index or noindex?") rather than
  pure definitions, though the AI authoring guidance allows up to a third of
  a deck to be definitional. card ids only need to be unique within their own
  deck; validateFlashcardRefs enforces that.
*/
const flashcardCard = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  tag: z.string().optional(),
});

export const flashcardDeckBlock = z.object({
  type: z.literal("flashcard-deck"),
  id: z.string().min(1),
  title: z.string().min(1),
  cards: z.array(flashcardCard).min(5).max(30),
});

export function validateFlashcardRefs(block: z.infer<typeof flashcardDeckBlock>): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  block.cards.forEach((card) => {
    if (seen.has(card.id)) {
      problems.push(`duplicate card id "${card.id}" in deck "${block.id}"`);
    }
    seen.add(card.id);
  });
  return problems;
}

export const lessonBlock = z.discriminatedUnion("type", [
  textBlock,
  analogyBlock,
  workedExampleBlock,
  flowchartBlock,
  quizBlock,
  cardSortBlock,
  sliderSimBlock,
  compareBlock,
  chartBlock,
  videoBlock,
  scenarioBlock,
  treeMapBlock,
  terminalSimBlock,
  missionBlock,
  simulationBlock,
  reflectionBlock,
  expertReviewBlock,
  graphDiagramBlock,
  frameworkCanvasBlock,
  financialStatementBlock,
  chartAdvancedBlock,
  timelineBlock,
  cardMatchBlock,
  whiteboardBlock,
  infographicBlock,
  hotspotBlock,
  chartXlBlock,
  flashcardDeckBlock,
]);

export const lessonContentSchema = z
  .object({
    intro: z.string().min(1),
    blocks: z.array(lessonBlock).min(4).max(16),
  })
  .superRefine((content, ctx) => {
    content.blocks.forEach((block, i) => {
      let problems: string[] = [];
      if (block.type === "simulation") {
        problems = validateSimulationRefs(block);
      } else if (block.type === "graph-diagram") {
        problems = validateGraphDiagramRefs(block);
      } else if (block.type === "framework-canvas") {
        problems = validateFrameworkCanvasRefs(block);
      } else if (block.type === "financial-statement") {
        problems = validateFinancialStatementRefs(block);
      } else if (block.type === "chart-advanced") {
        problems = validateChartAdvancedRefs(block);
      } else if (block.type === "timeline") {
        problems = validateTimelineRefs(block);
      } else if (block.type === "card-match") {
        problems = validateCardMatchRefs(block);
      } else if (block.type === "infographic") {
        problems = validateInfographicRefs(block);
      } else if (block.type === "hotspot") {
        problems = validateHotspotRefs(block);
      } else if (block.type === "chart-xl") {
        problems = validateChartXlRefs(block);
      } else if (block.type === "flashcard-deck") {
        problems = validateFlashcardRefs(block);
      }
      problems.forEach((message) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: ["blocks", i],
        });
      });
    });
  });

export type LessonBlock = z.infer<typeof lessonBlock>;
export type LessonContent = z.infer<typeof lessonContentSchema>;
export type MissionBlock = z.infer<typeof missionBlock>;
export type SimulationBlock = z.infer<typeof simulationBlock>;
export type ReflectionBlock = z.infer<typeof reflectionBlock>;
export type ExpertReviewBlock = z.infer<typeof expertReviewBlock>;
export type GraphDiagramBlock = z.infer<typeof graphDiagramBlock>;
export type FrameworkCanvasBlock = z.infer<typeof frameworkCanvasBlock>;
export type FinancialStatementBlock = z.infer<typeof financialStatementBlock>;
export type ChartAdvancedBlock = z.infer<typeof chartAdvancedBlock>;
export type TimelineBlock = z.infer<typeof timelineBlock>;
export type CardMatchBlock = z.infer<typeof cardMatchBlock>;
export type WhiteboardBlock = z.infer<typeof whiteboardBlock>;
export type InfographicBlock = z.infer<typeof infographicBlock>;
export type HotspotBlock = z.infer<typeof hotspotBlock>;
export type ChartXlBlock = z.infer<typeof chartXlBlock>;
export type FlashcardDeckBlock = z.infer<typeof flashcardDeckBlock>;

/*
  A learner's route through a simulation: the stage they were on and the
  choice they picked, in order. simulateMetrics and scoreSimulation both walk
  this same shape so the UI can share one recorded path between the trajectory
  chart and the score.
*/
export type SimulationPath = Array<{ stageId: string; choiceId: string }>;

/* Deterministic scoring used by interactive blocks and unit tests. */

export function scoreQuiz(block: z.infer<typeof quizBlock>, chosenIndex: number): number {
  return chosenIndex === block.correctIndex ? 100 : 0;
}

export function scoreCardSort(
  block: z.infer<typeof cardSortBlock>,
  placement: Record<string, string> // cardId -> bucketId chosen by the learner
): number {
  const total = block.cards.length;
  if (total === 0) return 0;
  const correct = block.cards.filter((c) => placement[c.id] === c.bucketId).length;
  return Math.round((correct / total) * 100);
}

/*
  Replays a learner's path through a simulation and returns the metric values
  at every step. trajectory[0] is the starting values; each following entry is
  the running values after that decision's effects are applied additively.
  Path entries pointing at a stage or choice that does not exist are skipped
  rather than throwing, since a stored path can outlive edits to the block.
*/
export function simulateMetrics(
  block: z.infer<typeof simulationBlock>,
  path: SimulationPath
): { trajectory: Array<Record<string, number>>; finals: Record<string, number> } {
  const stageById = new Map(block.stages.map((s) => [s.id, s]));
  const current: Record<string, number> = {};
  block.metrics.forEach((m) => {
    current[m.id] = m.start;
  });
  const trajectory: Array<Record<string, number>> = [{ ...current }];

  for (const step of path) {
    const stage = stageById.get(step.stageId);
    if (!stage) continue;
    const choice = stage.choices.find((c) => c.id === step.choiceId);
    if (!choice) continue;
    choice.effects.forEach((e) => {
      if (e.metricId in current) {
        current[e.metricId] += e.delta;
      }
    });
    trajectory.push({ ...current });
  }

  return { trajectory, finals: { ...current } };
}

const SIMULATION_QUALITY_SCORE: Record<"best" | "good" | "poor", number> = {
  best: 100,
  good: 60,
  poor: 20,
};

/*
  Scores a simulation attempt as the rounded average quality of every choice
  the learner actually made (best=100, good=60, poor=20). Path entries that do
  not match a real stage/choice are ignored; an attempt with no matched
  decisions scores 0 rather than dividing by zero.
*/
export function scoreSimulation(block: z.infer<typeof simulationBlock>, path: SimulationPath): number {
  const stageById = new Map(block.stages.map((s) => [s.id, s]));
  const scores: number[] = [];
  for (const step of path) {
    const stage = stageById.get(step.stageId);
    if (!stage) continue;
    const choice = stage.choices.find((c) => c.id === step.choiceId);
    if (!choice) continue;
    scores.push(SIMULATION_QUALITY_SCORE[choice.quality]);
  }
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

/*
  card-match answer shapes: each mode records the learner's attempt
  differently, so scoreCardMatch below takes a union and narrows on
  block.mode rather than trying to force one shape onto all three mechanics.
*/
export type CardMatchMatchPairsAnswer = Record<string, string>; // leftPairId -> rightPairId the learner chose
export type CardMatchSequenceAnswer = string[]; // stepIds in the order the learner placed them
export type CardMatchAssembleAnswer = string[]; // pieceIds the learner selected as "belongs in the target"

/*
  Scores a card-match attempt. The formula differs per mode:

  - match-pairs: each pair is inherently correct only when matched to
    itself (pairs are authored as already-correct left/right combinations),
    so the learner's choice for left-pair `p.id` is correct only when they
    chose right-pair `p.id` back. Score = correct / total pairs.

  - sequence: score = the fraction of stepIds sitting at the array index
    that equals their own correctPosition. A step placed one slot off still
    scores 0 for that step; there is no partial credit per-step, only across
    the whole sequence.

  - assemble: score = (piecesCorrectlySelected - piecesIncorrectlySelected)
    / totalCorrectPieces, clamped to [0, 100]. This rewards recognizing every
    genuine piece, penalizes grabbing distractors, and clamps so guessing
    every piece (all correct pieces plus all distractors) cannot exceed 100
    and a distractor-heavy guess cannot go negative.
*/
export function scoreCardMatch(
  block: z.infer<typeof cardMatchBlock>,
  answer: CardMatchMatchPairsAnswer | CardMatchSequenceAnswer | CardMatchAssembleAnswer
): number {
  if (block.mode === "match-pairs") {
    const pairs = block.pairs ?? [];
    if (pairs.length === 0) return 0;
    const chosen = answer as CardMatchMatchPairsAnswer;
    const correct = pairs.filter((p) => chosen[p.id] === p.id).length;
    return Math.round((correct / pairs.length) * 100);
  }

  if (block.mode === "sequence") {
    const steps = block.steps ?? [];
    if (steps.length === 0) return 0;
    const order = answer as CardMatchSequenceAnswer;
    const stepById = new Map(steps.map((s) => [s.id, s]));
    let correct = 0;
    order.forEach((stepId, index) => {
      const step = stepById.get(stepId);
      if (step && step.correctPosition === index) correct += 1;
    });
    return Math.round((correct / steps.length) * 100);
  }

  // assemble
  const pieces = block.pieces ?? [];
  const totalCorrectPieces = pieces.filter((p) => p.correct).length;
  if (totalCorrectPieces === 0) return 0;
  const selected = answer as CardMatchAssembleAnswer;
  const pieceById = new Map(pieces.map((p) => [p.id, p]));
  let correctSelected = 0;
  let incorrectSelected = 0;
  new Set(selected).forEach((id) => {
    const piece = pieceById.get(id);
    if (!piece) return;
    if (piece.correct) correctSelected += 1;
    else incorrectSelected += 1;
  });
  const raw = ((correctSelected - incorrectSelected) / totalCorrectPieces) * 100;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/* The regionIds the learner tapped as issues, in any order. */
export type HotspotAnswer = string[];

/*
  Scores a hotspot attempt: (true positives found - false positives clicked)
  / total issue regions, clamped to [0, 100], the same clamped formula shape
  as scoreCardMatch's assemble mode. A region id that does not exist on the
  block is ignored rather than throwing, since a stored answer can outlive
  edits to the block.
*/
export function scoreHotspot(block: z.infer<typeof hotspotBlock>, selectedRegionIds: string[]): number {
  const totalIssues = block.regions.filter((r) => r.isIssue).length;
  if (totalIssues === 0) return 0;
  const regionById = new Map(block.regions.map((r) => [r.id, r]));
  let truePositives = 0;
  let falsePositives = 0;
  new Set(selectedRegionIds).forEach((id) => {
    const region = regionById.get(id);
    if (!region) return;
    if (region.isIssue) truePositives += 1;
    else falsePositives += 1;
  });
  const raw = ((truePositives - falsePositives) / totalIssues) * 100;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/*
  chart-xl's probe scoring bands, matching the mission simulation's
  best/good/poor -> 100/60/20 shape (SIMULATION_QUALITY_SCORE above): a
  learner who answers correctly on the first attempt scores full marks, one
  who needed a retry scores partial credit, and one who gave up and revealed
  the answer scores the minimum non-zero credit for having engaged with it.
*/
export type ChartXlProbeOutcome = "correct-first-try" | "correct-retry" | "revealed";

const CHART_XL_PROBE_SCORE: Record<ChartXlProbeOutcome, number> = {
  "correct-first-try": 100,
  "correct-retry": 60,
  revealed: 20,
};

export function scoreChartXlProbe(outcome: ChartXlProbeOutcome): number {
  return CHART_XL_PROBE_SCORE[outcome];
}
