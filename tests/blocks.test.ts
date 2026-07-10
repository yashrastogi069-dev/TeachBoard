import { describe, expect, it } from "vitest";
import {
  cardMatchBlock,
  cardSortBlock,
  chartAdvancedBlock,
  expertReviewBlock,
  financialStatementBlock,
  frameworkCanvasBlock,
  graphDiagramBlock,
  hotspotBlock,
  infographicBlock,
  lessonBlock,
  lessonContentSchema,
  missionBlock,
  quizBlock,
  reflectionBlock,
  scoreCardMatch,
  scoreCardSort,
  scoreHotspot,
  scoreQuiz,
  scoreSimulation,
  simulateMetrics,
  simulationBlock,
  terminalSimBlock,
  timelineBlock,
  treeMapBlock,
  validateCardMatchRefs,
  validateChartAdvancedRefs,
  validateFinancialStatementRefs,
  validateFrameworkCanvasRefs,
  validateGraphDiagramRefs,
  validateHotspotRefs,
  validateInfographicRefs,
  validateSimulationRefs,
  validateTimelineRefs,
  whiteboardBlock,
} from "@/lib/blocks";

const quiz = quizBlock.parse({
  type: "quiz",
  question: "What does a canonical tag do?",
  options: [
    "Tells search engines which URL is the preferred version of a page",
    "Blocks a page from being crawled",
    "Speeds up page rendering",
  ],
  correctIndex: 0,
  explanation: "Canonical tags consolidate duplicate URLs onto one preferred version.",
});

const cardSort = cardSortBlock.parse({
  type: "card-sort",
  title: "On-page vs off-page SEO",
  buckets: [
    { id: "on", label: "On-page" },
    { id: "off", label: "Off-page" },
  ],
  cards: [
    { id: "c1", label: "Title tags", bucketId: "on" },
    { id: "c2", label: "Backlinks", bucketId: "off" },
    { id: "c3", label: "Internal linking", bucketId: "on" },
    { id: "c4", label: "Digital PR", bucketId: "off" },
  ],
});

describe("scoreQuiz", () => {
  it("scores 100 for the correct option", () => {
    expect(scoreQuiz(quiz, 0)).toBe(100);
  });

  it("scores 0 for a wrong option", () => {
    expect(scoreQuiz(quiz, 1)).toBe(0);
    expect(scoreQuiz(quiz, 2)).toBe(0);
  });
});

describe("scoreCardSort", () => {
  it("scores 100 when every card lands in its bucket", () => {
    expect(
      scoreCardSort(cardSort, { c1: "on", c2: "off", c3: "on", c4: "off" })
    ).toBe(100);
  });

  it("scores proportionally for partial placements", () => {
    expect(
      scoreCardSort(cardSort, { c1: "on", c2: "on", c3: "off", c4: "off" })
    ).toBe(50);
  });

  it("scores 0 when nothing is placed", () => {
    expect(scoreCardSort(cardSort, {})).toBe(0);
  });
});

describe("lessonContentSchema", () => {
  it("accepts a lesson that follows the teaching sequence", () => {
    const lesson = {
      intro: "Crawl budget decides how much of your site Google actually sees.",
      blocks: [
        { type: "text", markdown: "**Crawl budget** is the number of pages a search engine will fetch from your site in a given period." },
        {
          type: "analogy",
          title: "The supermarket restocker",
          markdown: "A restocker with one hour restocks the busiest aisles first; Googlebot spends its limited time on the pages your site signals matter most.",
        },
        {
          type: "worked-example",
          title: "Finding crawl waste in a 500-page store",
          markdown: "1. Export the crawl stats report.\n2. Group URLs by pattern.\n3. Faceted URLs eat 60 percent of hits: block them in robots.txt.",
        },
        {
          type: "flowchart",
          title: "How a page gets indexed",
          nodes: [
            { id: "a", label: "Discovered" },
            { id: "b", label: "Crawled" },
            { id: "c", label: "Rendered" },
            { id: "d", label: "Indexed" },
          ],
          edges: [
            { from: "a", to: "b" },
            { from: "b", to: "c" },
            { from: "c", to: "d", label: "if quality passes" },
          ],
        },
        {
          type: "quiz",
          question: "Which URL set most likely wastes crawl budget?",
          options: ["Faceted filter combinations", "The homepage", "Top category pages"],
          correctIndex: 0,
          explanation: "Faceted combinations multiply into near-duplicate URLs with little unique value.",
        },
        {
          type: "scenario",
          prompt: "A client's 10,000-page site has 200 pages indexed. Where do you look first?",
          hint: "Start with what the crawl stats and index coverage reports disagree about.",
        },
      ],
    };
    const parsed = lessonContentSchema.safeParse(lesson);
    expect(parsed.success).toBe(true);
  });

  it("rejects a lesson with too few blocks", () => {
    const parsed = lessonContentSchema.safeParse({
      intro: "Too thin to teach anything.",
      blocks: [{ type: "text", markdown: "Only one block." }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown block type", () => {
    const parsed = lessonContentSchema.safeParse({
      intro: "Bad block inside.",
      blocks: [
        { type: "text", markdown: "ok" },
        { type: "hologram", markdown: "not a real block" },
        { type: "text", markdown: "ok" },
        { type: "text", markdown: "ok" },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a quiz whose correctIndex is negative", () => {
    const parsed = quizBlock.safeParse({ ...quiz, correctIndex: -1 });
    expect(parsed.success).toBe(false);
  });
});

describe("tree-map block", () => {
  it("accepts a two-level concept map", () => {
    const parsed = treeMapBlock.safeParse({
      type: "tree-map",
      title: "What makes up technical SEO",
      root: {
        label: "Technical SEO",
        children: [
          {
            label: "Crawlability",
            detail: "Can search engines reach every page that matters?",
            children: [
              { label: "robots.txt", detail: "Rules for what crawlers may fetch." },
              { label: "XML sitemap", detail: "The list of URLs you want crawled." },
            ],
          },
          {
            label: "Indexability",
            detail: "Once crawled, is the page allowed and worthy of the index?",
          },
        ],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a root with a single branch", () => {
    const parsed = treeMapBlock.safeParse({
      type: "tree-map",
      title: "Too thin",
      root: {
        label: "Idea",
        children: [{ label: "Only branch", detail: "Not a decomposition." }],
      },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("terminal-sim block", () => {
  it("accepts a stepped console walkthrough", () => {
    const parsed = terminalSimBlock.safeParse({
      type: "terminal-sim",
      title: "Check how Google sees a page",
      description: "Fetch a page the way a crawler does and read the signals.",
      steps: [
        {
          command: "curl -I https://example.co.nz/products",
          output: "HTTP/2 200\ncontent-type: text/html\nx-robots-tag: noindex",
          note: "The 200 looks healthy, but x-robots-tag: noindex blocks indexing.",
        },
        {
          command: "curl -s https://example.co.nz/robots.txt",
          output: "User-agent: *\nDisallow: /cart\nSitemap: https://example.co.nz/sitemap.xml",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a walkthrough with a single step", () => {
    const parsed = terminalSimBlock.safeParse({
      type: "terminal-sim",
      title: "One step",
      description: "Not enough to walk through.",
      steps: [{ command: "ls", output: "app lib" }],
    });
    expect(parsed.success).toBe(false);
  });
});

const mission = {
  type: "mission" as const,
  title: "Turn around a churn-risk account",
  role: "You are the newly hired SEO lead at a mid-size retailer.",
  stakes: "The client cancels the contract in 30 days if organic traffic keeps falling.",
  objective: "Stabilise organic sessions before the next board review.",
  constraints: [
    { label: "Budget", value: "$2,000/month" },
    { label: "Timeline", value: "30 days" },
  ],
  briefing: "Traffic has dropped 40 percent over two months after a site migration.",
};

const reflection = {
  type: "reflection" as const,
  prompt: "Why did the client's trust drop after your second decision?",
  guidance:
    "A strong reflection names the specific decision, the metric it affected, and what you would do differently.",
};

const expertReview = {
  type: "expert-review" as const,
  title: "How a senior consultant reads your decisions",
  persona: "Senior SEO consultant, 12 years agency-side",
  rubric: [
    "Diagnosed the root cause before acting",
    "Prioritised fixes by traffic impact",
    "Communicated tradeoffs to the client",
  ],
};

// A valid simulation: s1 can branch forward straight to s3, skipping s2.
const validSimulation = {
  type: "simulation" as const,
  title: "Stabilise a churn-risk account",
  metrics: [
    { id: "trust", label: "Client trust", unit: "", start: 50, higherIsBetter: true },
    { id: "budget", label: "Remaining budget", unit: "$", start: 1000, higherIsBetter: true },
  ],
  stages: [
    {
      id: "s1",
      situation: "The client asks why traffic dropped right after the migration.",
      choices: [
        {
          id: "c1a",
          label: "Show the crawl and index data immediately",
          quality: "best" as const,
          feedback: "The client relaxes once they see you already have data.",
          effects: [{ metricId: "trust", delta: 10 }],
          goTo: "s3",
        },
        {
          id: "c1b",
          label: "Promise it will fix itself",
          quality: "poor" as const,
          feedback: "The client is unconvinced and asks for a plan.",
          effects: [{ metricId: "trust", delta: -5 }],
        },
      ],
    },
    {
      id: "s2",
      situation: "You need budget to run an urgent technical audit.",
      choices: [
        {
          id: "c2a",
          label: "Ask for a small, scoped audit budget",
          quality: "good" as const,
          feedback: "Approved, but it eats into next month's budget.",
          effects: [{ metricId: "budget", delta: -100 }],
        },
        {
          id: "c2b",
          label: "Ask for a full audit and rebuild budget",
          quality: "poor" as const,
          feedback: "The client balks at the size of the ask.",
          effects: [{ metricId: "budget", delta: -200 }],
        },
      ],
    },
    {
      id: "s3",
      situation: "The audit surfaces a canonical tag error from the migration.",
      choices: [
        {
          id: "c3a",
          label: "Fix the canonical tags and report the win",
          quality: "best" as const,
          feedback: "Traffic recovery begins within a week.",
          effects: [{ metricId: "budget", delta: 50 }],
        },
        {
          id: "c3b",
          label: "Note it for next sprint",
          quality: "good" as const,
          feedback: "The client appreciates the transparency but wants speed.",
          effects: [{ metricId: "trust", delta: 5 }],
        },
      ],
    },
  ],
  debrief: "Diagnosing before promising kept the client's trust intact through a rocky migration.",
};

describe("union accepts the mission-chain blocks", () => {
  it("parses a mission block through the discriminated union", () => {
    const parsed = lessonBlock.safeParse(mission);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.type).toBe("mission");
  });

  it("parses a valid simulation block through the discriminated union", () => {
    const parsed = lessonBlock.safeParse(validSimulation);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.type).toBe("simulation");
  });

  it("parses a reflection block through the discriminated union", () => {
    const parsed = lessonBlock.safeParse(reflection);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.type).toBe("reflection");
  });

  it("parses an expert-review block through the discriminated union", () => {
    const parsed = lessonBlock.safeParse(expertReview);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.type).toBe("expert-review");
  });
});

describe("validateSimulationRefs", () => {
  it("returns no problems for a valid simulation", () => {
    expect(validateSimulationRefs(simulationBlock.parse(validSimulation))).toEqual([]);
  });

  it("catches an effect that references an unknown metric", () => {
    const broken = {
      ...validSimulation,
      stages: validSimulation.stages.map((stage, i) =>
        i === 0
          ? {
              ...stage,
              choices: stage.choices.map((choice, j) =>
                j === 0 ? { ...choice, effects: [{ metricId: "loyalty", delta: 10 }] } : choice
              ),
            }
          : stage
      ),
    };
    const problems = validateSimulationRefs(simulationBlock.parse(broken));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/references unknown metric "loyalty"/);
  });

  it("catches a goTo that targets an unknown stage", () => {
    const broken = {
      ...validSimulation,
      stages: validSimulation.stages.map((stage, i) =>
        i === 0
          ? {
              ...stage,
              choices: stage.choices.map((choice, j) =>
                j === 0 ? { ...choice, goTo: "s99" } : choice
              ),
            }
          : stage
      ),
    };
    const problems = validateSimulationRefs(simulationBlock.parse(broken));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/branches to unknown stage "s99"/);
  });

  it("catches a goTo that branches backward", () => {
    const broken = {
      ...validSimulation,
      stages: validSimulation.stages.map((stage, i) =>
        i === 1
          ? {
              ...stage,
              choices: stage.choices.map((choice, j) =>
                j === 0 ? { ...choice, goTo: "s1" } : choice
              ),
            }
          : stage
      ),
    };
    const problems = validateSimulationRefs(simulationBlock.parse(broken));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/must branch forward, not to stage 0/);
  });
});

describe("lessonContentSchema with a simulation block", () => {
  const otherBlocks = [
    { type: "text", markdown: "Client trust is the currency you spend and earn on every account." },
    {
      type: "analogy",
      title: "The trust account",
      markdown: "Every decision is a deposit or a withdrawal from the same account.",
    },
  ];

  it("accepts a lesson whose simulation block has valid references", () => {
    const parsed = lessonContentSchema.safeParse({
      intro: "Practice the mission before the next section.",
      blocks: [...otherBlocks, mission, validSimulation, reflection, expertReview],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a lesson whose simulation block has a broken metric reference", () => {
    const broken = {
      ...validSimulation,
      stages: validSimulation.stages.map((stage, i) =>
        i === 0
          ? {
              ...stage,
              choices: stage.choices.map((choice, j) =>
                j === 0 ? { ...choice, effects: [{ metricId: "loyalty", delta: 10 }] } : choice
              ),
            }
          : stage
      ),
    };
    const parsed = lessonContentSchema.safeParse({
      intro: "Practice the mission before the next section.",
      blocks: [...otherBlocks, mission, broken, reflection, expertReview],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes("unknown metric"))).toBe(true);
    }
  });
});

describe("simulateMetrics", () => {
  const sim = simulationBlock.parse(validSimulation);

  it("starts the trajectory at each metric's start value", () => {
    const { trajectory } = simulateMetrics(sim, []);
    expect(trajectory).toEqual([{ trust: 50, budget: 1000 }]);
  });

  it("applies effects additively and follows a goTo branch that skips a stage", () => {
    const { trajectory, finals } = simulateMetrics(sim, [
      { stageId: "s1", choiceId: "c1a" }, // +10 trust, branches straight to s3
      { stageId: "s3", choiceId: "c3a" }, // +50 budget
    ]);
    expect(trajectory).toEqual([
      { trust: 50, budget: 1000 },
      { trust: 60, budget: 1000 },
      { trust: 60, budget: 1050 },
    ]);
    expect(finals).toEqual({ trust: 60, budget: 1050 });
  });

  it("skips path entries with an unknown stageId or choiceId", () => {
    const { trajectory, finals } = simulateMetrics(sim, [
      { stageId: "s1", choiceId: "c1a" },
      { stageId: "nope", choiceId: "c1a" },
      { stageId: "s3", choiceId: "nope" },
    ]);
    expect(trajectory).toEqual([
      { trust: 50, budget: 1000 },
      { trust: 60, budget: 1000 },
    ]);
    expect(finals).toEqual({ trust: 60, budget: 1000 });
  });
});

describe("scoreSimulation", () => {
  const sim = simulationBlock.parse(validSimulation);

  it("scores 100 when every matched choice is the best option", () => {
    expect(
      scoreSimulation(sim, [
        { stageId: "s1", choiceId: "c1a" },
        { stageId: "s3", choiceId: "c3a" },
      ])
    ).toBe(100);
  });

  it("averages mixed-quality choices", () => {
    // poor (20) + good (60) -> average 40
    expect(
      scoreSimulation(sim, [
        { stageId: "s1", choiceId: "c1b" },
        { stageId: "s2", choiceId: "c2a" },
      ])
    ).toBe(40);
  });

  it("scores 0 for an empty path", () => {
    expect(scoreSimulation(sim, [])).toBe(0);
  });

  it("scores 0 when no path entry matches a real stage or choice", () => {
    expect(scoreSimulation(sim, [{ stageId: "nope", choiceId: "nope" }])).toBe(0);
  });
});

/*
  Iteration 3 (PLAN.md "Artifact catalog v2"): tests for the 7 new schema
  families and their validate/score helpers.
*/

describe("graph-diagram block", () => {
  const flow = {
    type: "graph-diagram" as const,
    title: "How a lead becomes a customer",
    layout: "flow" as const,
    nodes: [
      { id: "lead", label: "Lead captured" },
      { id: "qualified", label: "Qualified" },
      { id: "won", label: "Won" },
    ],
    edges: [
      { from: "lead", to: "qualified" },
      { from: "qualified", to: "won", label: "if budget confirmed" },
    ],
  };

  it("accepts a valid flow layout", () => {
    expect(graphDiagramBlock.safeParse(flow).success).toBe(true);
  });

  it("rejects fewer than 2 nodes", () => {
    const parsed = graphDiagramBlock.safeParse({
      ...flow,
      nodes: [{ id: "lead", label: "Lead captured" }],
      edges: [],
    });
    expect(parsed.success).toBe(false);
  });

  const tree = {
    type: "graph-diagram" as const,
    title: "SEO ranking factors",
    layout: "tree" as const,
    rootId: "root",
    nodes: [
      { id: "root", label: "Ranking factors" },
      { id: "onpage", label: "On-page" },
      { id: "offpage", label: "Off-page" },
      { id: "titles", label: "Title tags", detail: "Primary keyword signal" },
    ],
    edges: [
      { from: "root", to: "onpage" },
      { from: "root", to: "offpage" },
      { from: "onpage", to: "titles" },
    ],
  };

  it("accepts a valid tree with no cycles and full reachability", () => {
    const parsed = graphDiagramBlock.parse(tree);
    expect(validateGraphDiagramRefs(parsed)).toEqual([]);
  });

  it("catches an edge referencing an unknown node", () => {
    const broken = graphDiagramBlock.parse({
      ...flow,
      edges: [...flow.edges, { from: "lead", to: "ghost" }],
    });
    const problems = validateGraphDiagramRefs(broken);
    expect(problems.some((p) => p.includes('unknown target node "ghost"'))).toBe(true);
  });

  it("catches a tree rootId that does not reference a real node", () => {
    const broken = graphDiagramBlock.parse({ ...tree, rootId: "nope" });
    const problems = validateGraphDiagramRefs(broken);
    expect(problems.some((p) => p.includes("rootId to reference a real node"))).toBe(true);
  });

  it("catches a node unreachable from rootId", () => {
    const broken = graphDiagramBlock.parse({
      ...tree,
      nodes: [...tree.nodes, { id: "orphan", label: "Disconnected" }],
    });
    const problems = validateGraphDiagramRefs(broken);
    expect(problems.some((p) => p.includes("unreachable from rootId") && p.includes("orphan"))).toBe(
      true
    );
  });

  it("catches a cycle reachable from rootId", () => {
    const broken = graphDiagramBlock.parse({
      ...tree,
      edges: [...tree.edges, { from: "titles", to: "root" }],
    });
    const problems = validateGraphDiagramRefs(broken);
    expect(problems.some((p) => p.includes("contains a cycle"))).toBe(true);
  });
});

describe("framework-canvas block", () => {
  const presented = {
    type: "framework-canvas" as const,
    title: "SWOT of a mid-size NZ retailer",
    framework: "swot" as const,
    mode: "presented" as const,
    cells: [
      { id: "s", label: "Strengths", content: "Strong loyalty programme and store footprint." },
      { id: "w", label: "Weaknesses", content: "Ageing e-commerce platform." },
      { id: "o", label: "Opportunities", content: "Same-day delivery partnerships." },
      { id: "t", label: "Threats", content: "Discount-focused new entrants." },
    ],
  };

  it("accepts a presented canvas with content in every cell", () => {
    const parsed = frameworkCanvasBlock.parse(presented);
    expect(validateFrameworkCanvasRefs(parsed)).toEqual([]);
  });

  it("rejects a presented canvas with an empty cell", () => {
    const broken = frameworkCanvasBlock.parse({
      ...presented,
      cells: presented.cells.map((c) => (c.id === "w" ? { ...c, content: "" } : c)),
    });
    const problems = validateFrameworkCanvasRefs(broken);
    expect(problems.some((p) => p.includes('cell "w" must have content'))).toBe(true);
  });

  const drafted = {
    type: "framework-canvas" as const,
    title: "Draft your own SWOT",
    framework: "swot" as const,
    mode: "drafted" as const,
    cells: [
      { id: "s", label: "Strengths" },
      { id: "w", label: "Weaknesses" },
      { id: "o", label: "Opportunities" },
      { id: "t", label: "Threats" },
    ],
    modelAnswer: [
      { cellId: "s", content: "Strong loyalty programme." },
      { cellId: "w", content: "Ageing platform." },
    ],
  };

  it("accepts a drafted canvas with a modelAnswer", () => {
    const parsed = frameworkCanvasBlock.parse(drafted);
    expect(validateFrameworkCanvasRefs(parsed)).toEqual([]);
  });

  it("rejects a drafted canvas with no modelAnswer", () => {
    const broken = frameworkCanvasBlock.parse({ ...drafted, modelAnswer: undefined });
    const problems = validateFrameworkCanvasRefs(broken);
    expect(problems.some((p) => p.includes("requires a modelAnswer"))).toBe(true);
  });

  it("rejects a modelAnswer that references an unknown cell", () => {
    const broken = frameworkCanvasBlock.parse({
      ...drafted,
      modelAnswer: [...drafted.modelAnswer, { cellId: "ghost", content: "Nothing here." }],
    });
    const problems = validateFrameworkCanvasRefs(broken);
    expect(problems.some((p) => p.includes('unknown cell "ghost"'))).toBe(true);
  });
});

describe("financial-statement block", () => {
  const statement = {
    type: "financial-statement" as const,
    title: "Simplified income statement",
    statementType: "income-statement" as const,
    lineItems: [
      { id: "units", label: "Units sold", value: 1000 },
      { id: "revenue", label: "Revenue", value: 45000, isTotal: true },
      { id: "cogs", label: "Cost of goods sold", value: 20000, indent: 1 },
      { id: "profit", label: "Gross profit", value: 25000, isTotal: true },
    ],
    drivers: [
      {
        id: "price",
        label: "Price per unit",
        min: 30,
        max: 60,
        step: 1,
        unit: "$",
        affects: [{ lineItemId: "revenue", factor: 45 }],
      },
    ],
  };

  it("accepts a statement with a valid driver reference", () => {
    const parsed = financialStatementBlock.parse(statement);
    expect(validateFinancialStatementRefs(parsed)).toEqual([]);
  });

  it("rejects fewer than 3 line items", () => {
    const parsed = financialStatementBlock.safeParse({
      ...statement,
      lineItems: statement.lineItems.slice(0, 2),
    });
    expect(parsed.success).toBe(false);
  });

  it("catches a driver affecting an unknown line item", () => {
    const broken = financialStatementBlock.parse({
      ...statement,
      drivers: [
        {
          ...statement.drivers[0],
          affects: [{ lineItemId: "ghost", factor: 45 }],
        },
      ],
    });
    const problems = validateFinancialStatementRefs(broken);
    expect(problems.some((p) => p.includes('unknown line item "ghost"'))).toBe(true);
  });
});

describe("chart-advanced block", () => {
  it("accepts a bubble variant with at least 2 points", () => {
    const parsed = chartAdvancedBlock.parse({
      type: "chart-advanced",
      title: "Channel spend vs conversions",
      variant: "bubble",
      bubblePoints: [
        { label: "Paid search", x: 5000, y: 400, size: 20 },
        { label: "Social", x: 2000, y: 150, size: 10 },
      ],
    });
    expect(validateChartAdvancedRefs(parsed)).toEqual([]);
  });

  it("rejects a bubble variant with fewer than 2 points", () => {
    const broken = chartAdvancedBlock.parse({
      type: "chart-advanced",
      title: "Channel spend vs conversions",
      variant: "bubble",
      bubblePoints: [{ label: "Paid search", x: 5000, y: 400, size: 20 }],
    });
    const problems = validateChartAdvancedRefs(broken);
    expect(problems.some((p) => p.includes("at least 2 bubblePoints"))).toBe(true);
  });

  it("accepts a heatmap variant with matching row/col dimensions", () => {
    const parsed = chartAdvancedBlock.parse({
      type: "chart-advanced",
      title: "Traffic by weekday and hour",
      variant: "heatmap",
      heatmapGrid: {
        rowLabels: ["Mon", "Tue"],
        colLabels: ["9am", "12pm", "3pm"],
        values: [
          [10, 20, 15],
          [12, 22, 18],
        ],
      },
    });
    expect(validateChartAdvancedRefs(parsed)).toEqual([]);
  });

  it("rejects a heatmap variant with mismatched row count", () => {
    const broken = chartAdvancedBlock.parse({
      type: "chart-advanced",
      title: "Traffic by weekday and hour",
      variant: "heatmap",
      heatmapGrid: {
        rowLabels: ["Mon", "Tue"],
        colLabels: ["9am", "12pm"],
        values: [[10, 20]],
      },
    });
    const problems = validateChartAdvancedRefs(broken);
    expect(problems.some((p) => p.includes("value row(s)"))).toBe(true);
  });

  it("rejects a heatmap variant with a mismatched column count in a row", () => {
    const broken = chartAdvancedBlock.parse({
      type: "chart-advanced",
      title: "Traffic by weekday and hour",
      variant: "heatmap",
      heatmapGrid: {
        rowLabels: ["Mon", "Tue"],
        colLabels: ["9am", "12pm"],
        values: [
          [10, 20],
          [12],
        ],
      },
    });
    const problems = validateChartAdvancedRefs(broken);
    expect(problems.some((p) => p.includes("row 1 has 1 value"))).toBe(true);
  });

  it("accepts a sankey variant whose links reference real nodes", () => {
    const parsed = chartAdvancedBlock.parse({
      type: "chart-advanced",
      title: "Budget flow",
      variant: "sankey",
      sankeyFlow: {
        nodes: [
          { id: "budget", label: "Total budget" },
          { id: "paid", label: "Paid media" },
          { id: "content", label: "Content" },
        ],
        links: [
          { from: "budget", to: "paid", value: 6000 },
          { from: "budget", to: "content", value: 4000 },
        ],
      },
    });
    expect(validateChartAdvancedRefs(parsed)).toEqual([]);
  });

  it("catches a sankey link referencing an unknown node", () => {
    const broken = chartAdvancedBlock.parse({
      type: "chart-advanced",
      title: "Budget flow",
      variant: "sankey",
      sankeyFlow: {
        nodes: [
          { id: "budget", label: "Total budget" },
          { id: "paid", label: "Paid media" },
        ],
        links: [{ from: "budget", to: "ghost", value: 6000 }],
      },
    });
    const problems = validateChartAdvancedRefs(broken);
    expect(problems.some((p) => p.includes('unknown node "ghost"'))).toBe(true);
  });

  it("catches a missing payload for the declared variant", () => {
    const broken = chartAdvancedBlock.parse({
      type: "chart-advanced",
      title: "Budget flow",
      variant: "sankey",
    });
    const problems = validateChartAdvancedRefs(broken);
    expect(problems.some((p) => p.includes("requires sankeyFlow"))).toBe(true);
  });
});

describe("timeline block", () => {
  const timeline = {
    type: "timeline" as const,
    title: "First 90 days SEO roadmap",
    events: [
      { id: "e1", date: "Month 1", title: "Technical audit", detail: "Fix crawl and index errors." },
      { id: "e2", date: "Month 2", title: "Content gap analysis", detail: "Map missing topics." },
      { id: "e3", date: "Month 3", title: "Link outreach", detail: "Build authority signals." },
    ],
    categories: ["Technical", "Content", "Authority"],
    currentPositionEventId: "e2",
  };

  it("accepts a timeline whose currentPositionEventId references a real event", () => {
    const parsed = timelineBlock.parse(timeline);
    expect(validateTimelineRefs(parsed)).toEqual([]);
  });

  it("rejects fewer than 3 events", () => {
    const parsed = timelineBlock.safeParse({ ...timeline, events: timeline.events.slice(0, 2) });
    expect(parsed.success).toBe(false);
  });

  it("catches a currentPositionEventId that does not reference a real event", () => {
    const broken = timelineBlock.parse({ ...timeline, currentPositionEventId: "ghost" });
    const problems = validateTimelineRefs(broken);
    expect(problems.some((p) => p.includes('"ghost" does not reference a real event'))).toBe(true);
  });
});

describe("card-match block", () => {
  const matchPairs = {
    type: "card-match" as const,
    title: "Match the SEO term to its definition",
    mode: "match-pairs" as const,
    pairs: [
      { id: "p1", left: "Canonical tag", right: "Marks the preferred version of a duplicate page" },
      { id: "p2", left: "Robots.txt", right: "Tells crawlers which paths not to fetch" },
      { id: "p3", left: "Sitemap", right: "Lists the URLs you want indexed" },
    ],
  };

  it("accepts a valid match-pairs block", () => {
    const parsed = cardMatchBlock.parse(matchPairs);
    expect(validateCardMatchRefs(parsed)).toEqual([]);
  });

  it("rejects match-pairs mode missing pairs", () => {
    const broken = cardMatchBlock.parse({ ...matchPairs, pairs: undefined });
    const problems = validateCardMatchRefs(broken);
    expect(problems.some((p) => p.includes("match-pairs mode requires pairs"))).toBe(true);
  });

  it("rejects match-pairs mode that also includes steps", () => {
    const broken = cardMatchBlock.parse({
      ...matchPairs,
      steps: [
        { id: "s1", label: "Step one", correctPosition: 0 },
        { id: "s2", label: "Step two", correctPosition: 1 },
        { id: "s3", label: "Step three", correctPosition: 2 },
      ],
    });
    const problems = validateCardMatchRefs(broken);
    expect(problems.some((p) => p.includes("must not include steps"))).toBe(true);
  });

  const sequence = {
    type: "card-match" as const,
    title: "Order the indexing pipeline",
    mode: "sequence" as const,
    steps: [
      { id: "discover", label: "Discovered", correctPosition: 0 },
      { id: "crawl", label: "Crawled", correctPosition: 1 },
      { id: "render", label: "Rendered", correctPosition: 2 },
      { id: "index", label: "Indexed", correctPosition: 3 },
    ],
  };

  it("accepts a valid sequence block with a correctPosition permutation", () => {
    const parsed = cardMatchBlock.parse(sequence);
    expect(validateCardMatchRefs(parsed)).toEqual([]);
  });

  it("rejects a sequence whose correctPosition values are not a permutation", () => {
    const broken = cardMatchBlock.parse({
      ...sequence,
      steps: sequence.steps.map((s, i) => ({ ...s, correctPosition: i === 0 ? 5 : i })),
    });
    const problems = validateCardMatchRefs(broken);
    expect(problems.some((p) => p.includes("must form a permutation"))).toBe(true);
  });

  const assemble = {
    type: "card-match" as const,
    title: "Build a working robots.txt",
    mode: "assemble" as const,
    targetLabel: "A robots.txt that blocks /cart and allows everything else",
    pieces: [
      { id: "ua", label: "User-agent: *", correct: true },
      { id: "disallow", label: "Disallow: /cart", correct: true },
      { id: "sitemap-wrong", label: "Sitemap: http://insecure.example", correct: false },
      { id: "allow-all-blocked", label: "Disallow: /", correct: false },
    ],
  };

  it("accepts a valid assemble block with enough correct pieces and a distractor", () => {
    const parsed = cardMatchBlock.parse(assemble);
    expect(validateCardMatchRefs(parsed)).toEqual([]);
  });

  it("rejects an assemble block missing targetLabel", () => {
    const broken = cardMatchBlock.parse({ ...assemble, targetLabel: undefined });
    const problems = validateCardMatchRefs(broken);
    expect(problems.some((p) => p.includes("requires targetLabel"))).toBe(true);
  });

  it("rejects an assemble block with fewer than 2 correct pieces", () => {
    const broken = cardMatchBlock.parse({
      ...assemble,
      pieces: assemble.pieces.map((p, i) => (i === 1 ? { ...p, correct: false } : p)),
    });
    const problems = validateCardMatchRefs(broken);
    expect(problems.some((p) => p.includes("at least 2 correct pieces"))).toBe(true);
  });

  it("rejects an assemble block with no distractor piece", () => {
    const broken = cardMatchBlock.parse({
      ...assemble,
      pieces: assemble.pieces.map((p) => ({ ...p, correct: true })),
    });
    const problems = validateCardMatchRefs(broken);
    expect(problems.some((p) => p.includes("at least 1 distractor piece"))).toBe(true);
  });

  describe("scoreCardMatch", () => {
    it("scores match-pairs 100 when every left pair is matched to itself", () => {
      const parsed = cardMatchBlock.parse(matchPairs);
      expect(scoreCardMatch(parsed, { p1: "p1", p2: "p2", p3: "p3" })).toBe(100);
    });

    it("scores match-pairs proportionally for partial correctness", () => {
      const parsed = cardMatchBlock.parse(matchPairs);
      // p1 correct, p2 swapped with p3, p3 swapped with p2 -> 1 of 3 correct
      expect(scoreCardMatch(parsed, { p1: "p1", p2: "p3", p3: "p2" })).toBe(33);
    });

    it("scores sequence 100 when every stepId sits at its correctPosition", () => {
      const parsed = cardMatchBlock.parse(sequence);
      expect(scoreCardMatch(parsed, ["discover", "crawl", "render", "index"])).toBe(100);
    });

    it("scores sequence partially when some steps are out of place", () => {
      const parsed = cardMatchBlock.parse(sequence);
      // discover(0) and render(2) land correctly, crawl and index are swapped -> 2 of 4
      expect(scoreCardMatch(parsed, ["discover", "index", "render", "crawl"])).toBe(50);
    });

    it("scores assemble 100 when only the correct pieces are selected", () => {
      const parsed = cardMatchBlock.parse(assemble);
      expect(scoreCardMatch(parsed, ["ua", "disallow"])).toBe(100);
    });

    it("scores assemble 0 when no pieces are selected", () => {
      const parsed = cardMatchBlock.parse(assemble);
      expect(scoreCardMatch(parsed, [])).toBe(0);
    });

    it("penalizes assemble for selecting distractors alongside correct pieces", () => {
      const parsed = cardMatchBlock.parse(assemble);
      // 2 correct - 1 distractor, over 2 total correct pieces -> (2-1)/2 = 50
      expect(scoreCardMatch(parsed, ["ua", "disallow", "sitemap-wrong"])).toBe(50);
    });

    it("clamps assemble score at 0 when distractors outweigh correct picks", () => {
      const parsed = cardMatchBlock.parse(assemble);
      // 0 correct - 2 distractors, over 2 total correct pieces -> negative, clamped to 0
      expect(scoreCardMatch(parsed, ["sitemap-wrong", "allow-all-blocked"])).toBe(0);
    });
  });
});

describe("whiteboard block", () => {
  it("accepts a whiteboard block with seed notes and a rubric", () => {
    const parsed = whiteboardBlock.safeParse({
      type: "whiteboard",
      title: "Map how ranking factors interact",
      prompt: "Place a note for each ranking factor and connect the ones that influence each other.",
      seedNotes: [
        { id: "n1", text: "Backlinks", x: 20, y: 30 },
        { id: "n2", text: "Content quality", x: 60, y: 30 },
      ],
      persona: "Senior SEO consultant, 12 years agency-side",
      rubric: ["Identifies at least 4 factors", "Draws at least 2 real relationships"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a whiteboard block with fewer than 2 rubric items", () => {
    const parsed = whiteboardBlock.safeParse({
      type: "whiteboard",
      title: "Map how ranking factors interact",
      prompt: "Place a note for each ranking factor.",
      persona: "Senior SEO consultant, 12 years agency-side",
      rubric: ["Identifies at least 4 factors"],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a seed note with an out-of-range position", () => {
    const parsed = whiteboardBlock.safeParse({
      type: "whiteboard",
      title: "Map how ranking factors interact",
      prompt: "Place a note for each ranking factor.",
      seedNotes: [{ id: "n1", text: "Backlinks", x: 120, y: 30 }],
      persona: "Senior SEO consultant, 12 years agency-side",
      rubric: ["Identifies at least 4 factors", "Draws at least 2 real relationships"],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("lessonContentSchema with the new artifact families", () => {
  const baseBlocks = [
    { type: "text", markdown: "Ranking factors interact in ways that are worth mapping visually." },
    {
      type: "analogy",
      title: "The recipe analogy",
      markdown: "Each ranking factor is an ingredient; none of them alone makes the dish.",
    },
  ];

  it("accepts a lesson containing all 7 new families with valid references", () => {
    const graph = {
      type: "graph-diagram" as const,
      title: "Decision tree for a traffic drop",
      layout: "tree" as const,
      rootId: "root",
      nodes: [
        { id: "root", label: "Traffic dropped" },
        { id: "a", label: "Check Search Console" },
        { id: "b", label: "Check server logs" },
      ],
      edges: [
        { from: "root", to: "a" },
        { from: "root", to: "b" },
      ],
    };
    const canvas = {
      type: "framework-canvas" as const,
      title: "PESTEL of the NZ retail market",
      framework: "pestel" as const,
      mode: "presented" as const,
      cells: [
        { id: "p", label: "Political", content: "Stable regulatory environment." },
        { id: "e", label: "Economic", content: "Inflation squeezing discretionary spend." },
      ],
    };
    const statement = {
      type: "financial-statement" as const,
      title: "Simplified P&L",
      statementType: "income-statement" as const,
      lineItems: [
        { id: "revenue", label: "Revenue", value: 10000, isTotal: true },
        { id: "cogs", label: "COGS", value: 4000 },
        { id: "profit", label: "Gross profit", value: 6000, isTotal: true },
      ],
    };
    const chart = {
      type: "chart-advanced" as const,
      title: "Spend vs conversions",
      variant: "bubble" as const,
      bubblePoints: [
        { label: "Paid search", x: 5000, y: 400, size: 20 },
        { label: "Social", x: 2000, y: 150, size: 10 },
      ],
    };
    const timeline = {
      type: "timeline" as const,
      title: "Roadmap",
      events: [
        { id: "e1", date: "Month 1", title: "Audit", detail: "Fix technical debt." },
        { id: "e2", date: "Month 2", title: "Content", detail: "Close topic gaps." },
        { id: "e3", date: "Month 3", title: "Links", detail: "Build authority." },
      ],
    };
    const match = {
      type: "card-match" as const,
      title: "Match term to definition",
      mode: "match-pairs" as const,
      pairs: [
        { id: "p1", left: "Canonical tag", right: "Preferred URL marker" },
        { id: "p2", left: "Robots.txt", right: "Crawler rules file" },
        { id: "p3", left: "Sitemap", right: "List of URLs to index" },
      ],
    };
    const whiteboard = {
      type: "whiteboard" as const,
      title: "Map the ranking factors",
      prompt: "Connect the factors that influence each other.",
      persona: "Senior SEO consultant, 12 years agency-side",
      rubric: ["Identifies at least 4 factors", "Draws at least 2 real relationships"],
    };

    const parsed = lessonContentSchema.safeParse({
      intro: "A single lesson exercising every artifact family.",
      blocks: [...baseBlocks, graph, canvas, statement, chart, timeline, match, whiteboard],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a lesson whose graph-diagram tree has an unreachable node", () => {
    const brokenGraph = {
      type: "graph-diagram" as const,
      title: "Broken tree",
      layout: "tree" as const,
      rootId: "root",
      nodes: [
        { id: "root", label: "Root" },
        { id: "a", label: "Reachable" },
        { id: "orphan", label: "Disconnected" },
      ],
      edges: [{ from: "root", to: "a" }],
    };
    const parsed = lessonContentSchema.safeParse({
      intro: "A lesson with a broken graph-diagram.",
      blocks: [...baseBlocks, brokenGraph, brokenGraph, brokenGraph, brokenGraph],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes("unreachable from rootId"))).toBe(
        true
      );
    }
  });
});

describe("infographic block", () => {
  const statRow = {
    type: "infographic" as const,
    title: "Zero-click search is the norm",
    layout: "stat-row" as const,
    stats: [
      { value: "47%", label: "of searches end with no click", trend: "up" as const },
      { value: "8.5B", label: "searches processed daily", icon: "magnifying-glass" },
    ],
  };

  it("accepts a stat-row layout with stats and no other payload", () => {
    const parsed = infographicBlock.parse(statRow);
    expect(validateInfographicRefs(parsed)).toEqual([]);
  });

  it("rejects a stat-row layout missing stats", () => {
    const broken = infographicBlock.parse({ ...statRow, stats: undefined });
    const problems = validateInfographicRefs(broken);
    expect(problems.some((p) => p.includes("stat-row layout requires stats"))).toBe(true);
  });

  it("rejects a stat-row layout that also carries steps", () => {
    const broken = infographicBlock.parse({
      ...statRow,
      steps: [
        { icon: "magnifying-glass", title: "Discover", detail: "Find the query." },
        { icon: "cursor-click", title: "Click", detail: "Or not." },
        { icon: "chart-bar", title: "Measure", detail: "Track the result." },
      ],
    });
    const problems = validateInfographicRefs(broken);
    expect(problems.some((p) => p.includes("stat-row layout must not include steps"))).toBe(true);
  });

  const iconProcess = {
    type: "infographic" as const,
    title: "How a search query resolves",
    layout: "icon-process" as const,
    steps: [
      { icon: "magnifying-glass", title: "Query entered", detail: "The user types a search." },
      { icon: "robot", title: "Crawled and ranked", detail: "Google matches intent to pages." },
      { icon: "cursor-click", title: "Result chosen", detail: "The user clicks or stays on the SERP." },
    ],
  };

  it("accepts an icon-process layout with steps and no other payload", () => {
    const parsed = infographicBlock.parse(iconProcess);
    expect(validateInfographicRefs(parsed)).toEqual([]);
  });

  it("rejects an icon-process layout missing steps", () => {
    const broken = infographicBlock.parse({ ...iconProcess, steps: undefined });
    const problems = validateInfographicRefs(broken);
    expect(problems.some((p) => p.includes("icon-process layout requires steps"))).toBe(true);
  });

  const comparisonStrip = {
    type: "infographic" as const,
    title: "On-page vs off-page SEO",
    layout: "comparison-strip" as const,
    comparison: {
      left: { label: "On-page", points: ["Title tags", "Internal linking"] },
      right: { label: "Off-page", points: ["Backlinks", "Digital PR"] },
    },
  };

  it("accepts a comparison-strip layout with comparison and no other payload", () => {
    const parsed = infographicBlock.parse(comparisonStrip);
    expect(validateInfographicRefs(parsed)).toEqual([]);
  });

  it("rejects a comparison-strip layout missing comparison", () => {
    const broken = infographicBlock.parse({ ...comparisonStrip, comparison: undefined });
    const problems = validateInfographicRefs(broken);
    expect(problems.some((p) => p.includes("comparison-strip layout requires comparison"))).toBe(true);
  });

  const bigNumber = {
    type: "infographic" as const,
    title: "The cost of a slow site",
    layout: "big-number" as const,
    bigNumber: {
      headline: "Every extra second of load time",
      value: "-7%",
      context: "in conversions, on average, for e-commerce pages.",
    },
  };

  it("accepts a big-number layout with bigNumber and no other payload", () => {
    const parsed = infographicBlock.parse(bigNumber);
    expect(validateInfographicRefs(parsed)).toEqual([]);
  });

  it("rejects a big-number layout missing bigNumber", () => {
    const broken = infographicBlock.parse({ ...bigNumber, bigNumber: undefined });
    const problems = validateInfographicRefs(broken);
    expect(problems.some((p) => p.includes("big-number layout requires bigNumber"))).toBe(true);
  });

  it("rejects a big-number layout that also carries stats", () => {
    const broken = infographicBlock.parse({ ...bigNumber, stats: statRow.stats });
    const problems = validateInfographicRefs(broken);
    expect(problems.some((p) => p.includes("big-number layout must not include stats"))).toBe(true);
  });

  it("rejects fewer than 2 stats at the zod level", () => {
    const parsed = infographicBlock.safeParse({ ...statRow, stats: [statRow.stats[0]] });
    expect(parsed.success).toBe(false);
  });
});

describe("hotspot block", () => {
  const scene = {
    type: "hotspot" as const,
    title: "Spot the problems in this GA4 report row",
    scenarioMarkdown: "A traffic report shows a sudden spike in sessions from one source.",
    regions: [
      {
        id: "r1",
        label: "Referral source",
        x: 10,
        y: 10,
        width: 20,
        height: 10,
        isIssue: true,
        explanation: "The referral domain is a known spam bot pattern.",
      },
      {
        id: "r2",
        label: "Session duration",
        x: 40,
        y: 10,
        width: 20,
        height: 10,
        isIssue: true,
        explanation: "Average session duration is 0 seconds, a bot signature.",
      },
      {
        id: "r3",
        label: "Pageviews",
        x: 10,
        y: 30,
        width: 20,
        height: 10,
        isIssue: false,
        explanation: "Pageviews here are normal and not a decoy issue.",
      },
      {
        id: "r4",
        label: "Bounce rate",
        x: 40,
        y: 30,
        width: 20,
        height: 10,
        isIssue: false,
        explanation: "Bounce rate is within the normal range.",
      },
    ],
  };

  it("accepts a scene with at least 2 issues and at least 1 decoy", () => {
    const parsed = hotspotBlock.parse(scene);
    expect(validateHotspotRefs(parsed)).toEqual([]);
  });

  it("rejects fewer than 4 regions at the zod level", () => {
    const parsed = hotspotBlock.safeParse({ ...scene, regions: scene.regions.slice(0, 3) });
    expect(parsed.success).toBe(false);
  });

  it("rejects a scene with fewer than 2 issue regions", () => {
    const broken = hotspotBlock.parse({
      ...scene,
      regions: scene.regions.map((r, i) => (i === 1 ? { ...r, isIssue: false } : r)),
    });
    const problems = validateHotspotRefs(broken);
    expect(problems.some((p) => p.includes("at least 2 regions with isIssue true"))).toBe(true);
  });

  it("rejects a scene with no decoy region", () => {
    const broken = hotspotBlock.parse({
      ...scene,
      regions: scene.regions.map((r) => ({ ...r, isIssue: true })),
    });
    const problems = validateHotspotRefs(broken);
    expect(problems.some((p) => p.includes("at least 1 decoy region"))).toBe(true);
  });

  describe("scoreHotspot", () => {
    it("scores 100 when every issue region is found and nothing else is selected", () => {
      const parsed = hotspotBlock.parse(scene);
      expect(scoreHotspot(parsed, ["r1", "r2"])).toBe(100);
    });

    it("scores 0 when nothing is selected", () => {
      const parsed = hotspotBlock.parse(scene);
      expect(scoreHotspot(parsed, [])).toBe(0);
    });

    it("reduces the score for a false positive selected alongside true positives", () => {
      const parsed = hotspotBlock.parse(scene);
      // 2 true positives - 1 false positive, over 2 total issues -> (2-1)/2 = 50
      expect(scoreHotspot(parsed, ["r1", "r2", "r3"])).toBe(50);
    });

    it("clamps at 0 when only false positives are selected", () => {
      const parsed = hotspotBlock.parse(scene);
      // 0 true positives - 2 false positives, over 2 total issues -> negative, clamped to 0
      expect(scoreHotspot(parsed, ["r3", "r4"])).toBe(0);
    });

    it("ignores an unknown region id in the selection", () => {
      const parsed = hotspotBlock.parse(scene);
      expect(scoreHotspot(parsed, ["r1", "r2", "ghost"])).toBe(100);
    });
  });
});

describe("lessonContentSchema with infographic and hotspot", () => {
  const baseBlocks = [
    { type: "text", markdown: "SEO reporting is full of noise that hides real problems." },
    {
      type: "analogy",
      title: "The smoke detector analogy",
      markdown: "Most alerts are false alarms; the skill is spotting the real fire fast.",
    },
  ];

  it("accepts a lesson containing both new families with valid references", () => {
    const infographic = {
      type: "infographic" as const,
      title: "Zero-click search is the norm",
      layout: "big-number" as const,
      bigNumber: {
        headline: "Nearly half of all searches",
        value: "47%",
        context: "end without a single click to any website.",
      },
    };
    const hotspot = {
      type: "hotspot" as const,
      title: "Spot the problems in this campaign setup",
      scenarioMarkdown: "A paid campaign is burning budget with no conversions.",
      regions: [
        {
          id: "r1",
          label: "Broad match keywords",
          x: 5,
          y: 5,
          width: 15,
          height: 10,
          isIssue: true,
          explanation: "Broad match with no negatives is wasting spend on irrelevant queries.",
        },
        {
          id: "r2",
          label: "Landing page mismatch",
          x: 25,
          y: 5,
          width: 15,
          height: 10,
          isIssue: true,
          explanation: "The ad promises a discount the landing page does not show.",
        },
        {
          id: "r3",
          label: "Ad schedule",
          x: 45,
          y: 5,
          width: 15,
          height: 10,
          isIssue: false,
          explanation: "The ad schedule matches the audience's active hours correctly.",
        },
        {
          id: "r4",
          label: "Budget cap",
          x: 65,
          y: 5,
          width: 15,
          height: 10,
          isIssue: false,
          explanation: "The daily budget cap is set appropriately for this account.",
        },
      ],
    };

    const parsed = lessonContentSchema.safeParse({
      intro: "A lesson exercising the infographic and hotspot families.",
      blocks: [...baseBlocks, infographic, hotspot],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a lesson whose infographic layout omits its required field", () => {
    const brokenInfographic = {
      type: "infographic" as const,
      title: "Broken stat row",
      layout: "stat-row" as const,
    };
    const parsed = lessonContentSchema.safeParse({
      intro: "A lesson with a broken infographic.",
      blocks: [...baseBlocks, brokenInfographic, brokenInfographic],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes("stat-row layout requires stats"))).toBe(
        true
      );
    }
  });

  it("rejects a lesson whose hotspot scene has no decoy region", () => {
    const brokenHotspot = {
      type: "hotspot" as const,
      title: "Broken scene",
      scenarioMarkdown: "Every region is flagged as an issue, so nothing acts as a decoy.",
      regions: [
        { id: "r1", label: "A", x: 0, y: 0, width: 10, height: 10, isIssue: true, explanation: "Issue one." },
        { id: "r2", label: "B", x: 10, y: 0, width: 10, height: 10, isIssue: true, explanation: "Issue two." },
        { id: "r3", label: "C", x: 20, y: 0, width: 10, height: 10, isIssue: true, explanation: "Issue three." },
        { id: "r4", label: "D", x: 30, y: 0, width: 10, height: 10, isIssue: true, explanation: "Issue four." },
      ],
    };
    const parsed = lessonContentSchema.safeParse({
      intro: "A lesson with a broken hotspot.",
      blocks: [...baseBlocks, brokenHotspot, brokenHotspot],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((issue) => issue.message.includes("at least 1 decoy region"))
      ).toBe(true);
    }
  });
});
