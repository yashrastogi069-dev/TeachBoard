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
} from "@/components/artifacts/InteractiveBlocks";

/*
  Maps a validated lesson block to its component. onCheck receives 0-100
  scores from interactive checks; onDiscuss opens the tutor with a seeded
  message. Unknown types render nothing (forward compatibility).
*/
export default function ArtifactRenderer({
  block,
  onCheck,
  onDiscuss,
}: {
  block: LessonBlock;
  onCheck: (score: number) => void;
  onDiscuss: (message: string) => void;
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
    case "scenario":
      return <ScenarioBlock block={block} onDiscuss={onDiscuss} />;
    default:
      return null;
  }
}
