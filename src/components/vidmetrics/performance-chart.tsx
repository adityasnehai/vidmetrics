"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleHelp, ExternalLink } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { VideoMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type ChartMode = "views" | "velocity" | "engagement";
type ChartViewMode = "all" | "shorts" | "videos";

type ChartPoint = {
  label: string;
  title: string;
  videoUrl: string;
  trend: string;
  primaryValue: number;
  secondaryValue: number;
  primaryDisplay: string;
  secondaryDisplay: string;
  primaryLabel: string;
  secondaryLabel: string;
};

const chartModes: Record<
  ChartMode,
  {
    label: string;
    sortKey: keyof Pick<
      VideoMetric,
      "viewCount" | "viewsPerDay" | "engagementRate"
    >;
    primaryLabel: string;
    secondaryLabel: string;
    primaryColor: string;
    secondaryColor: string;
    primaryFormatter: (value: number) => string;
    secondaryFormatter: (value: number) => string;
    getPrimaryValue: (video: VideoMetric) => number;
    getSecondaryValue: (video: VideoMetric) => number;
  }
> = {
  views: {
    label: "Views",
    sortKey: "viewCount",
    primaryLabel: "Views",
    secondaryLabel: "Engagement",
    primaryColor: "#7C3AED",
    secondaryColor: "#0F766E",
    primaryFormatter: (value) => compactNumber.format(value),
    secondaryFormatter: (value) => `${value.toFixed(1)}%`,
    getPrimaryValue: (video) => video.viewCount,
    getSecondaryValue: (video) => video.engagementRate,
  },
  velocity: {
    label: "Views/day",
    sortKey: "viewsPerDay",
    primaryLabel: "Views/day",
    secondaryLabel: "Score",
    primaryColor: "#6D28D9",
    secondaryColor: "#D97706",
    primaryFormatter: (value) => compactNumber.format(value),
    secondaryFormatter: (value) => value.toFixed(0),
    getPrimaryValue: (video) => video.viewsPerDay,
    getSecondaryValue: (video) => video.performanceScore,
  },
  engagement: {
    label: "Engagement",
    sortKey: "engagementRate",
    primaryLabel: "Engagement",
    secondaryLabel: "Views/day",
    primaryColor: "#0F766E",
    secondaryColor: "#7C3AED",
    primaryFormatter: (value) => `${value.toFixed(1)}%`,
    secondaryFormatter: (value) => compactNumber.format(value),
    getPrimaryValue: (video) => video.engagementRate,
    getSecondaryValue: (video) => video.viewsPerDay,
  },
};

function InfoTooltip({ tooltip }: { tooltip: string }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label="What this chart means"
        className="text-muted hover:text-foreground inline-flex size-4 items-center justify-center rounded-full transition"
      >
        <CircleHelp className="size-3" />
      </button>
      <div className="border-border bg-surface pointer-events-none absolute top-5 left-1/2 z-20 hidden w-72 -translate-x-1/2 rounded-[16px] border px-3 py-2.5 text-left text-xs leading-5 text-[var(--muted-strong)] shadow-[0_16px_36px_rgba(15,23,42,0.12)] group-hover:block">
        {tooltip}
      </div>
    </div>
  );
}

type HoverState = {
  point: ChartPoint;
  x: number;
  y: number;
};

function HoverCard({
  state,
  left,
  top,
  onMouseEnter,
  onMouseLeave,
}: {
  state: HoverState | null;
  left: number;
  top: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  if (!state) {
    return null;
  }

  return (
    <div
      className="border-border bg-surface-strong absolute z-10 w-72 max-w-[calc(100%-1.5rem)] rounded-2xl border px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
      style={{ left, top }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold">
          {state.point.title}
        </p>
        <a
          href={state.point.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="text-muted hover:text-foreground mt-0.5 inline-flex shrink-0 transition"
          aria-label={`Open ${state.point.title} on YouTube`}
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>
      <p className="text-muted mt-1 text-xs tracking-[0.18em] uppercase">
        {state.point.trend}
      </p>
      <div className="mt-3 space-y-1 text-sm">
        <p>
          {state.point.primaryLabel}: {state.point.primaryDisplay}
        </p>
        <p>
          {state.point.secondaryLabel}: {state.point.secondaryDisplay}
        </p>
      </div>
      <a
        href={state.point.videoUrl}
        target="_blank"
        rel="noreferrer"
        className="text-accent-strong mt-3 inline-flex items-center gap-1.5 text-sm font-medium transition hover:opacity-80"
      >
        Open video
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}

export function PerformanceChart({
  videos,
  formatScope,
}: {
  videos: VideoMetric[];
  formatScope: ChartViewMode;
}) {
  const [mode, setMode] = useState<ChartMode>("views");
  const [viewMode, setViewMode] = useState<ChartViewMode>(formatScope);
  const [chartLimit, setChartLimit] = useState("6");
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const [tooltipHovered, setTooltipHovered] = useState(false);
  const [chartFrameSize, setChartFrameSize] = useState({
    width: 0,
    height: 0,
  });
  const chartFrameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setViewMode(formatScope);
  }, [formatScope]);

  useEffect(() => {
    setHoverState(null);
    setTooltipHovered(false);
  }, [mode, viewMode, chartLimit, videos]);

  useEffect(() => {
    const element = chartFrameRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      setChartFrameSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const scopedVideos = useMemo(() => {
    if (viewMode === "all") {
      return videos;
    }

    if (viewMode === "shorts") {
      return videos.filter((video) => video.formatLabel === "Short");
    }

    return videos.filter((video) => video.formatLabel !== "Short");
  }, [videos, viewMode]);

  const config = chartModes[mode];
  const parsedChartLimit = Number(chartLimit);
  const safeChartLimit =
    Number.isFinite(parsedChartLimit) && parsedChartLimit > 0
      ? Math.min(Math.round(parsedChartLimit), Math.max(scopedVideos.length, 1))
      : 6;
  const rankedVideos = [...scopedVideos]
    .sort((left, right) => right[config.sortKey] - left[config.sortKey])
    .slice(0, safeChartLimit);

  const chartData: ChartPoint[] = rankedVideos.map((video) => ({
    label:
      video.title.length > 18
        ? `${video.title.slice(0, 18).trimEnd()}...`
        : video.title,
    title: video.title,
    videoUrl: video.videoUrl,
    trend: video.trend,
    primaryValue: config.getPrimaryValue(video),
    secondaryValue: config.getSecondaryValue(video),
    primaryDisplay: config.primaryFormatter(config.getPrimaryValue(video)),
    secondaryDisplay: config.secondaryFormatter(
      config.getSecondaryValue(video),
    ),
    primaryLabel: config.primaryLabel,
    secondaryLabel: config.secondaryLabel,
  }));
  const chartLeader = chartData[0] ?? null;
  const chartSummary = chartLeader
    ? `${chartLeader.title} leads here on ${config.primaryLabel.toLowerCase()} with ${chartLeader.primaryDisplay}.`
    : "Analyze a channel to compare the strongest videos here.";
  const chartInfo = `This chart uses the top ${chartData.length} analyzed videos in this chart view, ranked by ${config.label.toLowerCase()}. You can change how many videos appear. The filled line shows ${config.primaryLabel.toLowerCase()}, and the second line shows ${config.secondaryLabel.toLowerCase()}.`;
  const hoverCardLeft = hoverState
    ? Math.min(
        Math.max(hoverState.x + 14, 12),
        Math.max(chartFrameSize.width - 300, 12),
      )
    : 12;
  const hoverCardTop = hoverState
    ? Math.min(
        Math.max(hoverState.y - 20, 12),
        Math.max(chartFrameSize.height - 148, 12),
      )
    : 12;
  // Attach hover behavior to the plotted dots so the title and outbound link
  // always belong to the exact point the user is interacting with.
  const renderInteractiveDot = ({
    cx,
    cy,
    payload,
  }: {
    cx?: number;
    cy?: number;
    payload?: ChartPoint;
  }) => {
    if (cx == null || cy == null || !payload) {
      return null;
    }

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={10}
          fill="transparent"
          onMouseEnter={() =>
            setHoverState({
              point: payload,
              x: cx,
              y: cy,
            })
          }
          onClick={() =>
            window.open(payload.videoUrl, "_blank", "noopener,noreferrer")
          }
          style={{ cursor: "pointer" }}
        />
        <circle cx={cx} cy={cy} r={4} fill={config.secondaryColor} />
      </g>
    );
  };
  const openVideoFromState = (state?: {
    activePayload?: Array<{ payload?: ChartPoint }>;
  }) => {
    const point = state?.activePayload?.[0]?.payload;

    if (!point?.videoUrl) {
      return;
    }

    window.open(point.videoUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-xl space-y-2">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold">
              Compare the strongest videos
            </p>
            <InfoTooltip tooltip={chartInfo} />
          </div>
          <p className="text-muted max-w-xl text-sm leading-6">
            Compare the top {chartData.length} videos by views, pace, or
            engagement.
          </p>
        </div>

        <div>
          <div className="border-border bg-surface inline-flex rounded-[18px] border p-1">
            {(
              [
                ["all", "All"],
                ["shorts", "Shorts"],
                ["videos", "Long video"],
              ] as Array<[ChartViewMode, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setViewMode(value)}
                className={cn(
                  "min-h-9 rounded-[14px] px-3 py-1.5 text-sm font-medium transition",
                  viewMode === value
                    ? "bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] text-white shadow-[0_10px_20px_rgba(91,33,182,0.12)]"
                    : "text-muted-strong hover:bg-accent-surface hover:text-accent-strong",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-border w-full overflow-hidden rounded-[24px] border bg-[linear-gradient(180deg,var(--surface),var(--surface-soft))] p-4 sm:p-5">
        <div className="mb-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
              <div className="space-y-1">
                <p className="text-muted font-mono text-[11px] tracking-[0.16em] uppercase">
                  Compare by
                </p>
                <div className="border-border bg-surface-soft inline-flex flex-wrap rounded-[16px] border p-1">
                  {(
                    Object.entries(chartModes) as Array<
                      [ChartMode, (typeof chartModes)[ChartMode]]
                    >
                  ).map(([value, item]) => {
                    const inputId = `performance-mode-${value}`;

                    return (
                      <label
                        key={value}
                        htmlFor={inputId}
                        className={cn(
                          "cursor-pointer rounded-[12px] px-3.5 py-1.5 text-sm font-medium transition",
                          value === mode
                            ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                            : "text-muted-strong hover:text-foreground",
                        )}
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name="performance-mode"
                          value={value}
                          checked={mode === value}
                          onChange={() => setMode(value)}
                          className="sr-only"
                        />
                        {item.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className="space-y-1">
                <span className="text-muted font-mono text-[11px] tracking-[0.16em] uppercase">
                  Videos
                </span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(scopedVideos.length, 1)}
                  inputMode="numeric"
                  value={chartLimit}
                  onChange={(event) => setChartLimit(event.target.value)}
                  className="border-border bg-surface text-foreground clean-url-input h-10 w-20 rounded-[14px] border px-3 text-sm transition outline-none"
                  aria-label="How many videos to compare"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: config.primaryColor }}
                />
                {config.primaryLabel}
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: config.secondaryColor }}
                />
                {config.secondaryLabel}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-muted text-sm leading-6">{chartSummary}</p>
            {hoverState ? (
              <a
                href={hoverState.point.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent-strong inline-flex items-center gap-1.5 text-sm font-medium transition hover:opacity-80"
              >
                Open hovered video
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              <p className="text-muted text-xs leading-5">
                Hover or click a point to open that video.
              </p>
            )}
          </div>
        </div>

        <div
          ref={chartFrameRef}
          className="relative"
          onMouseLeave={() => {
            if (!tooltipHovered) {
              setHoverState(null);
            }
          }}
        >
          <HoverCard
            state={hoverState}
            left={hoverCardLeft}
            top={hoverCardTop}
            onMouseEnter={() => setTooltipHovered(true)}
            onMouseLeave={() => {
              setTooltipHovered(false);
              setHoverState(null);
            }}
          />

          <div className="h-[17rem] sm:h-[18.5rem]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                onClick={(state) =>
                  openVideoFromState(
                    state as {
                      activePayload?: Array<{ payload?: ChartPoint }>;
                    },
                  )
                }
              >
                <CartesianGrid
                  stroke="rgba(148,163,184,0.24)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="rgba(100,116,139,0.72)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  yAxisId="primary"
                  stroke="rgba(100,116,139,0.72)"
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(value: number) =>
                    config.primaryFormatter(value)
                  }
                />
                <YAxis
                  yAxisId="secondary"
                  orientation="right"
                  stroke="rgba(100,116,139,0.72)"
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(value: number) =>
                    config.secondaryFormatter(value)
                  }
                />
                <Tooltip
                  content={() => null}
                  cursor={{ stroke: "rgba(15,118,110,0.16)", strokeWidth: 1 }}
                />
                <Area
                  yAxisId="primary"
                  type="monotone"
                  dataKey="primaryValue"
                  fill={`${config.primaryColor}22`}
                  stroke={config.primaryColor}
                  strokeWidth={2.5}
                />
                <Line
                  yAxisId="secondary"
                  type="monotone"
                  dataKey="secondaryValue"
                  stroke={config.secondaryColor}
                  strokeWidth={2.5}
                  dot={renderInteractiveDot}
                  activeDot={renderInteractiveDot}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
