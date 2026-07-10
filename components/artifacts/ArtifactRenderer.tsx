"use client";

import type { LessonBlock } from "@/lib/blocks";
import {
  AnalogyBlock,
  ChartBlock,
  CompareBlock,
  FlowchartBlock,
  TextBlock,
  VideoBlock,
  WorkedExampleBlock,
} from "@/components/artifacts/SimpleBlocks";
import {
  CardSortBlock,
  QuizBlock,
  ScenarioBlock,
  SliderSimBlock,
  TerminalSimBlock,
  TreeMapBlock,
} from "@/components/artifacts/InteractiveBlocks";
import {
  ExpertReview,
  MissionBriefing,
  ReflectionPrompt,
  SimulationPlayer,
} from "@/components/artifacts/MissionBlocks";
import GraphDiagramBlock from "@/components/artifacts/GraphDiagramBlock";
import TimelineBlock from "@/components/artifacts/TimelineBlock";
import { FrameworkCanvasBlock } from "@/components/artifacts/FrameworkCanvasBlock";
import { FinancialStatementBlock } from "@/components/artifacts/FinancialStatementBlock";
import { ChartAdvancedBlock } from "@/components/artifacts/ChartAdvancedBlock";
import CardMatchBlock from "@/components/artifacts/CardMatchBlock";
import WhiteboardBlock from "@/components/artifacts/WhiteboardBlock";
import InfographicBlock from "@/components/artifacts/InfographicBlock";
import HotspotBlock from "@/components/artifacts/HotspotBlock";

/*
  Maps a validated lesson block to its component. onCheck receives 0-100
  scores from interactive checks; onDiscuss opens the tutor with a seeded
  message. lessonId + blockIndex are passed through so mission blocks can
  persist the run to /api/mission. Unknown types render nothing (forward
  compatibility).
*/
export default function ArtifactRenderer({
  block,
  onCheck,
  onDiscuss,
  lessonId,
  blockIndex,
}: {
  block: LessonBlock;
  onCheck: (score: number) => void;
  onDiscuss: (message: string) => void;
  lessonId?: string;
  blockIndex?: number;
}) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "analogy":
      return <AnalogyBlock block={block} />;
    case "worked-example":
      return <WorkedExampleBlock block={block} />;
    case "compare":
      return <CompareBlock block={block} />;
    case "chart":
      return <ChartBlock block={block} />;
    case "flowchart":
      return <FlowchartBlock block={block} />;
    case "video":
      return <VideoBlock block={block} />;
    case "quiz":
      return <QuizBlock block={block} onCheck={onCheck} />;
    case "card-sort":
      return <CardSortBlock block={block} onCheck={onCheck} />;
    case "slider-sim":
      return <SliderSimBlock block={block} />;
    case "tree-map":
      return <TreeMapBlock block={block} />;
    case "terminal-sim":
      return <TerminalSimBlock block={block} />;
    case "scenario":
      return <ScenarioBlock block={block} onDiscuss={onDiscuss} />;
    case "mission":
      return <MissionBriefing block={block} />;
    case "simulation":
      return (
        <SimulationPlayer
          block={block}
          onCheck={onCheck}
          lessonId={lessonId}
          blockIndex={blockIndex}
        />
      );
    case "reflection":
      return <ReflectionPrompt block={block} onCheck={onCheck} onDiscuss={onDiscuss} />;
    case "expert-review":
      return (
        <ExpertReview
          block={block}
          onCheck={onCheck}
          lessonId={lessonId}
          blockIndex={blockIndex}
        />
      );
    case "graph-diagram":
      return <GraphDiagramBlock block={block} />;
    case "timeline":
      return <TimelineBlock block={block} />;
    case "framework-canvas":
      return <FrameworkCanvasBlock block={block} onCheck={onCheck} onDiscuss={onDiscuss} />;
    case "financial-statement":
      return <FinancialStatementBlock block={block} />;
    case "chart-advanced":
      return <ChartAdvancedBlock block={block} />;
    case "card-match":
      return <CardMatchBlock block={block} onCheck={onCheck} />;
    case "whiteboard":
      return (
        <WhiteboardBlock
          block={block}
          onCheck={onCheck}
          lessonId={lessonId}
          blockIndex={blockIndex}
        />
      );
    case "infographic":
      return <InfographicBlock block={block} />;
    case "hotspot":
      return <HotspotBlock block={block} onCheck={onCheck} />;
    default:
      return null;
  }
}
