"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import {
  BarChart,
  LineChart,
  ScatterChart,
  CandlestickChart,
  PieChart,
  RadarChart,
  FunnelChart,
  SunburstChart,
  TreemapChart,
  SankeyChart,
  GraphChart,
  ThemeRiverChart,
  HeatmapChart,
  CustomChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  SingleAxisComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type {
  EChartsCoreOption,
  CustomSeriesRenderItemParams,
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemReturn,
} from "echarts";
import "echarts-wordcloud";
import type { ChartXlBlock, ChartXlTreeNode } from "@/lib/blocks";

/*
  ChartXLCanvas: the client-only ECharts renderer for a chart-xl block. It is
  never imported directly by page code -- ChartXLBlock loads it through
  next/dynamic with ssr:false so ECharts stays out of the SSR/first-paint
  path. Every kind maps to exactly one ECharts option built from the single
  populated payload (see CHART_XL_PAYLOAD_BY_KIND in lib/blocks.ts). Colours
  are read from the design tokens on the host element at mount, never
  hardcoded, so per-track accents flow through automatically.
*/

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  CandlestickChart,
  PieChart,
  RadarChart,
  FunnelChart,
  SunburstChart,
  TreemapChart,
  SankeyChart,
  GraphChart,
  ThemeRiverChart,
  HeatmapChart,
  CustomChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  SingleAxisComponent,
  CanvasRenderer,
]);

type Tokens = {
  accent: string;
  accentBright: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderStrong: string;
  bgElevated: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  palette: string[];
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(full || "888888", 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function mix(hex: string, toward: number, amount: number): string {
  if (!hex.startsWith("#")) return hex;
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(c + (toward - c) * amount);
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

const lighten = (hex: string, amount: number) => mix(hex, 255, amount);
const darken = (hex: string, amount: number) => mix(hex, 0, amount);

function readTokens(el: HTMLElement): Tokens {
  const cs = getComputedStyle(el);
  const get = (name: string, fallback: string) => {
    const v = cs.getPropertyValue(name).trim();
    return v.length > 0 ? v : fallback;
  };
  const accent = get("--accent", "#6d7cff");
  const accentBright = get("--accent-bright", "#9aa6ff");
  const info = get("--info", "#38bdf8");
  const success = get("--success", "#34d399");
  const warning = get("--warning", "#fbbf24");
  const danger = get("--danger", "#f87171");
  const base = [accent, info, success, warning, danger, accentBright];
  const palette = [
    ...base,
    ...base.map((c) => lighten(c, 0.3)),
    ...base.map((c) => darken(c, 0.24)),
  ];
  return {
    accent,
    accentBright,
    text: get("--text", "#f5f5f8"),
    textMuted: get("--text-muted", "#c2c2cf"),
    textFaint: get("--text-faint", "#8f8fa0"),
    border: get("--border", "rgba(255,255,255,0.07)"),
    borderStrong: get("--border-strong", "rgba(255,255,255,0.14)"),
    bgElevated: get("--bg-elevated", "#221f2b"),
    success,
    warning,
    danger,
    info,
    palette,
  };
}

function tooltipStyle(t: Tokens) {
  return {
    backgroundColor: t.bgElevated,
    borderColor: t.borderStrong,
    borderWidth: 1,
    textStyle: { color: t.text, fontSize: 12 },
    extraCssText: "border-radius:10px;box-shadow:0 8px 24px -12px rgba(0,0,0,0.6);",
  };
}

function legendStyle(t: Tokens) {
  return {
    type: "scroll" as const,
    top: 0,
    textStyle: { color: t.textMuted, fontSize: 12 },
    inactiveColor: t.textFaint,
    pageIconColor: t.accent,
    pageTextStyle: { color: t.textFaint },
  };
}

function cartesianAxis(t: Tokens, kind: "category" | "value", name?: string) {
  return {
    type: kind,
    name,
    nameTextStyle: { color: t.textFaint, fontSize: 11 },
    axisLine: { lineStyle: { color: t.borderStrong } },
    axisTick: { show: false },
    axisLabel: { color: t.textFaint, fontSize: 11 },
    splitLine: { lineStyle: { color: t.border } },
  };
}

function unitSuffix(unit: string): string {
  return unit ? ` ${unit}` : "";
}

/* Convert lib/blocks tree nodes into ECharts tree data (name/value/children). */
function toEChartsTree(
  nodes: ChartXlTreeNode[]
): Array<{ name: string; value?: number; children?: unknown[] }> {
  return nodes.map((n) => ({
    name: n.name,
    value: n.value,
    children: n.children ? toEChartsTree(n.children) : undefined,
  }));
}

function buildOption(block: ChartXlBlock, t: Tokens, animate: boolean): EChartsCoreOption {
  const unit = block.unit ?? "";
  const common = {
    color: t.palette,
    backgroundColor: "transparent",
    textStyle: { color: t.textMuted, fontFamily: "inherit" },
    animation: animate,
    animationDuration: 300,
    animationEasing: "cubicOut" as const,
  };

  switch (block.kind) {
    case "bar":
    case "stacked-bar":
    case "line":
    case "area": {
      const p = block.cartesian!;
      const stacked = block.kind === "stacked-bar";
      const isLine = block.kind === "line" || block.kind === "area";
      const series = p.series.map((s) => ({
        name: s.name,
        type: isLine ? ("line" as const) : ("bar" as const),
        data: s.values,
        stack: stacked ? "total" : undefined,
        smooth: block.kind !== "bar" && block.kind !== "stacked-bar" ? true : false,
        showSymbol: isLine ? false : undefined,
        areaStyle: block.kind === "area" ? { opacity: 0.18 } : undefined,
        emphasis: { focus: "series" as const },
        barMaxWidth: !isLine ? 32 : undefined,
        itemStyle: { borderRadius: !isLine ? [4, 4, 0, 0] : undefined },
      }));
      return {
        ...common,
        tooltip: {
          trigger: "axis",
          axisPointer: { type: isLine ? "line" : "shadow", lineStyle: { color: t.borderStrong } },
          valueFormatter: (v: number | string) => `${v}${unitSuffix(unit)}`,
          ...tooltipStyle(t),
        },
        legend: p.series.length > 1 ? { data: p.series.map((s) => s.name), ...legendStyle(t) } : undefined,
        grid: { left: 8, right: 16, top: p.series.length > 1 ? 36 : 16, bottom: 8, containLabel: true },
        xAxis: { ...cartesianAxis(t, "category"), data: p.categories },
        yAxis: { ...cartesianAxis(t, "value", unit || undefined) },
        series,
      };
    }

    case "scatter":
    case "bubble": {
      const p = block.points!;
      const isBubble = block.kind === "bubble";
      const sizes = p.series.flatMap((s) => s.points.map((pt) => pt.size ?? 0));
      const maxSize = Math.max(1, ...sizes);
      const series = p.series.map((s) => ({
        name: s.name,
        type: "scatter" as const,
        data: s.points.map((pt) => ({
          value: [pt.x, pt.y],
          name: pt.label ?? "",
        })),
        symbolSize: isBubble
          ? (val: number[], params: { dataIndex: number }) => {
              const raw = s.points[params.dataIndex]?.size ?? 0;
              return 8 + (raw / maxSize) * 40;
            }
          : 11,
        emphasis: { focus: "series" as const },
        itemStyle: { opacity: 0.82 },
      }));
      return {
        ...common,
        tooltip: {
          trigger: "item",
          formatter: (params: { seriesName: string; data: { value: number[]; name?: string } }) => {
            const label = params.data.name ? `${params.data.name}<br/>` : "";
            return `${label}${params.seriesName}: (${params.data.value[0]}, ${params.data.value[1]})${unitSuffix(unit)}`;
          },
          ...tooltipStyle(t),
        },
        legend: p.series.length > 1 ? { data: p.series.map((s) => s.name), ...legendStyle(t) } : undefined,
        grid: { left: 8, right: 16, top: p.series.length > 1 ? 36 : 16, bottom: 8, containLabel: true },
        xAxis: { ...cartesianAxis(t, "value"), scale: true },
        yAxis: { ...cartesianAxis(t, "value", unit || undefined), scale: true },
        series,
      };
    }

    case "candlestick": {
      const p = block.candles!;
      return {
        ...common,
        tooltip: { trigger: "axis", axisPointer: { type: "cross" }, ...tooltipStyle(t) },
        grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
        xAxis: { ...cartesianAxis(t, "category"), data: p.categories },
        yAxis: { ...cartesianAxis(t, "value", unit || undefined), scale: true },
        series: [
          {
            type: "candlestick" as const,
            data: p.values.map((v) => [...v]),
            itemStyle: {
              color: t.success,
              color0: t.danger,
              borderColor: t.success,
              borderColor0: t.danger,
            },
          },
        ],
      };
    }

    case "pie":
    case "donut": {
      const p = block.parts!;
      const donut = block.kind === "donut";
      return {
        ...common,
        tooltip: {
          trigger: "item",
          formatter: (params: { name: string; value: number; percent: number }) =>
            `${params.name}: ${params.value}${unitSuffix(unit)} (${params.percent}%)`,
          ...tooltipStyle(t),
        },
        legend: { ...legendStyle(t), type: "scroll", orient: "horizontal" },
        series: [
          {
            type: "pie" as const,
            radius: donut ? ["46%", "72%"] : "68%",
            center: ["50%", "56%"],
            data: p.items.map((i) => ({ name: i.name, value: i.value })),
            label: { color: t.textMuted, fontSize: 12 },
            labelLine: { lineStyle: { color: t.border } },
            itemStyle: { borderColor: t.bgElevated, borderWidth: 2 },
            emphasis: {
              focus: "self" as const,
              label: { color: t.text, fontWeight: "bold" },
            },
          },
        ],
      };
    }

    case "funnel": {
      const p = block.parts!;
      return {
        ...common,
        tooltip: {
          trigger: "item",
          formatter: (params: { name: string; value: number }) =>
            `${params.name}: ${params.value}${unitSuffix(unit)}`,
          ...tooltipStyle(t),
        },
        legend: { ...legendStyle(t) },
        series: [
          {
            type: "funnel" as const,
            sort: "descending" as const,
            top: 36,
            bottom: 8,
            gap: 2,
            data: p.items.map((i) => ({ name: i.name, value: i.value })),
            label: { color: t.text, fontSize: 12, position: "inside" as const },
            itemStyle: { borderColor: t.bgElevated, borderWidth: 1 },
            emphasis: { focus: "self" as const, label: { fontWeight: "bold" } },
          },
        ],
      };
    }

    case "wordcloud": {
      const p = block.parts!;
      const palette = t.palette;
      return {
        ...common,
        tooltip: {
          trigger: "item",
          formatter: (params: { name: string; value: number }) =>
            `${params.name}: ${params.value}${unitSuffix(unit)}`,
          ...tooltipStyle(t),
        },
        series: [
          {
            type: "wordCloud",
            shape: "circle",
            gridSize: 8,
            sizeRange: [14, 54],
            rotationRange: [0, 0],
            drawOutOfBound: false,
            width: "100%",
            height: "100%",
            textStyle: {
              fontFamily: "inherit",
              fontWeight: "600",
              color: (params: { dataIndex: number }) => palette[params.dataIndex % palette.length],
            },
            emphasis: { textStyle: { color: t.accentBright } },
            data: p.items.map((i) => ({ name: i.name, value: i.value })),
          },
        ],
      };
    }

    case "radar": {
      const p = block.radar!;
      return {
        ...common,
        tooltip: { trigger: "item", ...tooltipStyle(t) },
        legend: p.series.length > 1 ? { data: p.series.map((s) => s.name), ...legendStyle(t) } : undefined,
        radar: {
          indicator: p.axes.map((a) => ({ name: a.name, max: a.max })),
          center: ["50%", "56%"],
          radius: "66%",
          axisName: { color: t.textMuted, fontSize: 11 },
          splitLine: { lineStyle: { color: t.border } },
          splitArea: { areaStyle: { color: ["transparent", t.border] } },
          axisLine: { lineStyle: { color: t.border } },
        },
        series: [
          {
            type: "radar" as const,
            data: p.series.map((s) => ({ name: s.name, value: s.values })),
            areaStyle: { opacity: 0.14 },
            symbolSize: 5,
            emphasis: { focus: "series" as const },
          },
        ],
      };
    }

    case "sunburst": {
      const p = block.tree!;
      return {
        ...common,
        tooltip: {
          trigger: "item",
          formatter: (params: { name: string; value?: number }) =>
            `${params.name}${params.value != null ? `: ${params.value}${unitSuffix(unit)}` : ""}`,
          ...tooltipStyle(t),
        },
        series: [
          {
            type: "sunburst" as const,
            radius: ["12%", "92%"],
            center: ["50%", "54%"],
            data: toEChartsTree(p.nodes),
            label: { color: t.text, fontSize: 11 },
            itemStyle: { borderColor: t.bgElevated, borderWidth: 1 },
            emphasis: { focus: "ancestor" as const },
          },
        ],
      };
    }

    case "treemap": {
      const p = block.tree!;
      return {
        ...common,
        tooltip: {
          trigger: "item",
          formatter: (params: { name: string; value?: number }) =>
            `${params.name}${params.value != null ? `: ${params.value}${unitSuffix(unit)}` : ""}`,
          ...tooltipStyle(t),
        },
        series: [
          {
            type: "treemap" as const,
            roam: false,
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
            data: toEChartsTree(p.nodes),
            label: { color: t.text, fontSize: 12 },
            upperLabel: { show: true, color: t.textMuted, height: 20 },
            breadcrumb: { show: false },
            itemStyle: { borderColor: t.bgElevated, borderWidth: 2, gapWidth: 2 },
            levels: [
              { itemStyle: { borderColor: t.bgElevated, borderWidth: 3, gapWidth: 3 } },
              { itemStyle: { borderColor: t.bgElevated, borderWidth: 1, gapWidth: 1 } },
            ],
            emphasis: { focus: "descendant" as const },
          },
        ],
      };
    }

    case "sankey": {
      const p = block.flow!;
      const idToLabel = new Map(p.nodes.map((n) => [n.id, n.label]));
      return {
        ...common,
        tooltip: { trigger: "item", ...tooltipStyle(t) },
        series: [
          {
            type: "sankey" as const,
            top: 8,
            bottom: 8,
            left: 8,
            right: 16,
            data: p.nodes.map((n) => ({ name: n.id })),
            links: p.links.map((l) => ({ source: l.from, target: l.to, value: l.value })),
            nodeAlign: "justify" as const,
            label: {
              color: t.textMuted,
              fontSize: 11,
              formatter: (params: { name: string }) => idToLabel.get(params.name) ?? params.name,
            },
            lineStyle: { color: "gradient", opacity: 0.32, curveness: 0.5 },
            itemStyle: { borderColor: t.bgElevated, borderWidth: 1 },
            emphasis: { focus: "adjacency" as const },
          },
        ],
      };
    }

    case "graph": {
      const p = block.flow!;
      const idToLabel = new Map(p.nodes.map((n) => [n.id, n.label]));
      return {
        ...common,
        tooltip: { trigger: "item", ...tooltipStyle(t) },
        series: [
          {
            type: "graph" as const,
            layout: "force" as const,
            roam: true,
            draggable: true,
            force: { repulsion: 180, edgeLength: 120, gravity: 0.08 },
            data: p.nodes.map((n) => ({ name: n.id, symbolSize: 30, value: n.label })),
            links: p.links.map((l) => ({ source: l.from, target: l.to, value: l.value })),
            label: {
              show: true,
              color: t.text,
              fontSize: 11,
              position: "right" as const,
              formatter: (params: { name: string }) => idToLabel.get(params.name) ?? params.name,
            },
            lineStyle: { color: t.textFaint, opacity: 0.5, curveness: 0.1 },
            itemStyle: { color: t.accent, borderColor: t.bgElevated, borderWidth: 1 },
            emphasis: { focus: "adjacency" as const, lineStyle: { width: 3 } },
          },
        ],
      };
    }

    case "themeriver": {
      const p = block.river!;
      const seen: string[] = [];
      p.points.forEach((pt) => {
        if (!seen.includes(pt.date)) seen.push(pt.date);
      });
      return {
        ...common,
        tooltip: { trigger: "axis", axisPointer: { type: "line" }, ...tooltipStyle(t) },
        legend: { data: p.series, ...legendStyle(t) },
        singleAxis: {
          type: "category" as const,
          data: seen,
          boundaryGap: false,
          top: 40,
          bottom: 12,
          axisLine: { lineStyle: { color: t.borderStrong } },
          axisLabel: { color: t.textFaint, fontSize: 11 },
          axisTick: { lineStyle: { color: t.border } },
        },
        series: [
          {
            type: "themeRiver" as const,
            data: p.points.map((pt) => [pt.date, pt.value, pt.series]),
            label: { show: false },
            emphasis: { focus: "series" as const },
            itemStyle: { borderColor: t.bgElevated, borderWidth: 1 },
          },
        ],
      };
    }

    case "heatmap": {
      const p = block.grid!;
      const data: Array<[number, number, number]> = [];
      let min = Infinity;
      let max = -Infinity;
      p.values.forEach((row, r) => {
        row.forEach((val, c) => {
          data.push([c, r, val]);
          if (val < min) min = val;
          if (val > max) max = val;
        });
      });
      if (!isFinite(min)) min = 0;
      if (!isFinite(max)) max = 1;
      return {
        ...common,
        tooltip: {
          trigger: "item",
          formatter: (params: { value: [number, number, number] }) => {
            const [c, r, v] = params.value;
            return `${p.rowLabels[r]} / ${p.colLabels[c]}: ${v}${unitSuffix(unit)}`;
          },
          ...tooltipStyle(t),
        },
        grid: { left: 8, right: 8, top: 8, bottom: 48, containLabel: true },
        xAxis: {
          type: "category" as const,
          data: p.colLabels,
          splitArea: { show: true },
          axisLine: { lineStyle: { color: t.borderStrong } },
          axisLabel: { color: t.textFaint, fontSize: 11 },
          axisTick: { show: false },
        },
        yAxis: {
          type: "category" as const,
          data: p.rowLabels,
          splitArea: { show: true },
          axisLine: { lineStyle: { color: t.borderStrong } },
          axisLabel: { color: t.textFaint, fontSize: 11 },
          axisTick: { show: false },
        },
        visualMap: {
          min,
          max,
          calculable: true,
          orient: "horizontal" as const,
          left: "center",
          bottom: 4,
          textStyle: { color: t.textFaint, fontSize: 11 },
          inRange: { color: [darken(t.accent, 0.55), t.accent, t.accentBright] },
        },
        series: [
          {
            type: "heatmap" as const,
            data,
            label: { show: true, color: t.text, fontSize: 10 },
            itemStyle: { borderColor: t.bgElevated, borderWidth: 1 },
            emphasis: { itemStyle: { borderColor: t.text, borderWidth: 1 } },
          },
        ],
      };
    }

    case "gantt": {
      const p = block.tasks!;
      const rows = p.items.map((i) => i.label);
      const minStart = Math.min(...p.items.map((i) => i.start));
      const maxEnd = Math.max(...p.items.map((i) => i.end));
      const groups: string[] = [];
      p.items.forEach((i) => {
        const g = i.group ?? "default";
        if (!groups.includes(g)) groups.push(g);
      });
      const groupColor = (g: string) => t.palette[groups.indexOf(g) % t.palette.length];
      const renderItem = (
        params: CustomSeriesRenderItemParams,
        api: CustomSeriesRenderItemAPI
      ): CustomSeriesRenderItemReturn => {
        const rowIndex = api.value(0) as number;
        const start = api.coord([api.value(1), rowIndex]);
        const end = api.coord([api.value(2), rowIndex]);
        const height = (api.size?.([0, 1]) as number[])[1] * 0.55;
        const width = Math.max(2, end[0] - start[0]);
        const color = groupColor(p.items[params.dataIndex].group ?? "default");
        return {
          type: "rect",
          shape: {
            x: start[0],
            y: start[1] - height / 2,
            width,
            height,
            r: 4,
          },
          style: { fill: color, opacity: 0.85 },
        };
      };
      return {
        ...common,
        tooltip: {
          trigger: "item",
          formatter: (params: { dataIndex: number }) => {
            const it = p.items[params.dataIndex];
            return `${it.label}${it.group ? ` (${it.group})` : ""}: ${it.start} to ${it.end}${unitSuffix(unit)}`;
          },
          ...tooltipStyle(t),
        },
        grid: { left: 8, right: 16, top: 12, bottom: 8, containLabel: true },
        xAxis: {
          type: "value" as const,
          min: minStart,
          max: maxEnd,
          axisLine: { lineStyle: { color: t.borderStrong } },
          axisLabel: { color: t.textFaint, fontSize: 11 },
          splitLine: { lineStyle: { color: t.border } },
        },
        yAxis: {
          type: "category" as const,
          data: rows,
          inverse: true,
          axisLine: { lineStyle: { color: t.borderStrong } },
          axisLabel: { color: t.textFaint, fontSize: 11 },
          axisTick: { show: false },
        },
        series: [
          {
            type: "custom" as const,
            renderItem,
            encode: { x: [1, 2], y: 0 },
            data: p.items.map((i, idx) => ({ value: [idx, i.start, i.end], name: i.label })),
          },
        ],
      };
    }

    default: {
      // Exhaustive: every kind is handled above.
      return { ...common };
    }
  }
}

export default function ChartXLCanvas({
  block,
  animate,
  focus,
  height = 340,
}: {
  block: ChartXlBlock;
  animate: boolean;
  focus: string | null;
  height?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  // Init + rebuild option whenever the block or motion preference changes.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const tokens = readTokens(host);
    const chart = echarts.init(host, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    chart.setOption(buildOption(block, tokens, animate));

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(host);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [block, animate]);

  // Story focus: downplay everything, then highlight the focused target.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.dispatchAction({ type: "downplay" });
    if (!focus) return;
    chart.dispatchAction({ type: "highlight", seriesName: focus });
    chart.dispatchAction({ type: "highlight", name: focus });
  }, [focus]);

  return <div ref={hostRef} style={{ width: "100%", height }} aria-hidden="true" />;
}
