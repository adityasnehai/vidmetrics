"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleHelp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { VideoMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

type ContentViewMode = "all" | "shorts" | "videos";

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

const barColor = "#7C3AED";

function formatCompact(value: number) {
  return compactNumber.format(value);
}

function formatDurationBucket(seconds: number) {
  if (seconds <= 30) {
    return "0-30s";
  }

  if (seconds <= 60) {
    return "31-60s";
  }

  if (seconds <= 75) {
    return "61-75s";
  }

  if (seconds < 300) {
    return "1-5 min";
  }

  if (seconds < 600) {
    return "5-10 min";
  }

  if (seconds < 1200) {
    return "10-20 min";
  }

  return "20+ min";
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: Record<string, unknown>;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0];

  if (!point) {
    return null;
  }

  return (
    <div className="border-border bg-surface-strong min-w-44 rounded-2xl border px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
      <p className="text-sm font-semibold">{label ?? point.name}</p>
      <div className="mt-2 space-y-1 text-sm">
        <p>
          Videos:{" "}
          {typeof point.value === "number"
            ? compactNumber.format(point.value)
            : String(point.value)}
        </p>
        {"avgViewsPerDay" in point.payload &&
        typeof point.payload.avgViewsPerDay === "number" ? (
          <p>
            Avg views/day:{" "}
            {compactNumber.format(
              Math.round(point.payload.avgViewsPerDay as number),
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CardInfoTooltip({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={`What ${label} means`}
        className="text-muted hover:text-foreground inline-flex size-4 items-center justify-center rounded-full transition"
      >
        <CircleHelp className="size-3" />
      </button>
      <div className="border-border bg-surface pointer-events-none absolute top-5 left-1/2 z-20 hidden w-64 -translate-x-1/2 rounded-[16px] border px-3 py-2.5 text-left text-xs leading-5 text-[var(--muted-strong)] shadow-[0_16px_36px_rgba(15,23,42,0.12)] group-hover:block">
        {tooltip}
      </div>
    </div>
  );
}

export function ContentAnalysis({
  videos,
  formatScope,
}: {
  videos: VideoMetric[];
  formatScope: ContentViewMode;
}) {
  const [viewMode, setViewMode] = useState<ContentViewMode>(formatScope);

  useEffect(() => {
    setViewMode(formatScope);
  }, [formatScope]);

  const scopedVideos = useMemo(() => {
    if (viewMode === "all") {
      return videos;
    }

    if (viewMode === "shorts") {
      return videos.filter((video) => video.formatLabel === "Short");
    }

    return videos.filter((video) => video.formatLabel !== "Short");
  }, [videos, viewMode]);

  const durationData = useMemo(() => {
    const bucketOrder = [
      "0-30s",
      "31-60s",
      "61-75s",
      "1-5 min",
      "5-10 min",
      "10-20 min",
      "20+ min",
    ];
    const groups = new Map<
      string,
      { label: string; count: number; viewsPerDay: number[] }
    >();

    for (const video of scopedVideos) {
      const bucket = formatDurationBucket(video.durationSeconds);
      const current = groups.get(bucket) ?? {
        label: bucket,
        count: 0,
        viewsPerDay: [],
      };

      current.count += 1;
      current.viewsPerDay.push(video.viewsPerDay);
      groups.set(bucket, current);
    }

    return bucketOrder.map((label) => {
      const group = groups.get(label) ?? {
        label,
        count: 0,
        viewsPerDay: [],
      };

      return {
        label: group.label,
        count: group.count,
        avgViewsPerDay: average(group.viewsPerDay),
      };
    });
  }, [scopedVideos]);

  const scheduleData = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const groups = new Map<
      string,
      { label: string; count: number; viewsPerDay: number[] }
    >(
      labels.map((label) => [
        label,
        {
          label,
          count: 0,
          viewsPerDay: [],
        },
      ]),
    );

    for (const video of scopedVideos) {
      const label = dayFormatter.format(new Date(video.publishedAt));
      const current = groups.get(label);

      if (!current) {
        continue;
      }

      current.count += 1;
      current.viewsPerDay.push(video.viewsPerDay);
    }

    return labels.map((label) => {
      const group = groups.get(label)!;
      return {
        label,
        count: group.count,
        avgViewsPerDay: average(group.viewsPerDay),
      };
    });
  }, [scopedVideos]);

  const strongestDuration =
    [...durationData]
      .filter((item) => item.count > 0)
      .sort((left, right) => right.avgViewsPerDay - left.avgViewsPerDay)[0] ??
    null;
  const busiestDay =
    [...scheduleData].sort((left, right) => right.count - left.count)[0] ??
    null;
  const maxScheduleCount = Math.max(
    ...scheduleData.map((item) => item.count),
    1,
  );

  const overview = strongestDuration
    ? `${strongestDuration.label} videos are getting the strongest daily view average here.`
    : "This view needs more videos before a clear pattern appears.";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted max-w-xl text-sm leading-6">
          See which video lengths show up most and which days this channel posts
          on.
        </p>

        <div className="border-border bg-surface flex rounded-[18px] border p-1">
          {(
            [
              ["all", "All"],
              ["shorts", "Shorts"],
              ["videos", "Long video"],
            ] as Array<[ContentViewMode, string]>
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

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="border-border rounded-[24px] border bg-[linear-gradient(180deg,var(--surface),var(--surface-soft))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold">Video length</p>
                <CardInfoTooltip
                  label="Video length"
                  tooltip="This chart groups the videos by length so you can see which lengths appear most often and which one is doing best on views per day."
                />
              </div>
              <p className="text-muted mt-1 text-sm leading-6">
                See which video lengths appear most often.
              </p>
            </div>
            <div className="text-right">
              <p className="text-foreground text-lg font-[family:var(--font-display)] font-semibold tracking-[-0.04em]">
                {strongestDuration?.label ?? "-"}
              </p>
              <p className="text-muted text-xs">Best length</p>
            </div>
          </div>

          <div className="mt-4 h-[15rem]">
            {durationData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={durationData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="lengthMixFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={barColor}
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="100%"
                        stopColor={barColor}
                        stopOpacity={0.04}
                      />
                    </linearGradient>
                  </defs>
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
                    stroke="rgba(100,116,139,0.72)"
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    dataKey="count"
                    name="Videos"
                    type="monotone"
                    stroke={barColor}
                    fill="url(#lengthMixFill)"
                    strokeWidth={2.5}
                  />
                  <Line
                    dataKey="count"
                    name="Videos"
                    type="monotone"
                    stroke={barColor}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: barColor, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: barColor, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted flex h-full items-center justify-center text-sm">
                No length pattern yet.
              </div>
            )}
          </div>

          <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-3">
            <p className="text-muted text-xs">What is working best</p>
            <p className="mt-1 text-sm font-medium">
              {strongestDuration
                ? `${strongestDuration.label} videos are averaging ${formatCompact(Math.round(strongestDuration.avgViewsPerDay))} views per day.`
                : "Not enough data yet"}
            </p>
          </div>
        </div>

        <div className="border-border rounded-[24px] border bg-[linear-gradient(180deg,var(--surface),var(--surface-soft))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold">Publish timing</p>
                <CardInfoTooltip
                  label="Publish timing"
                  tooltip="This chart shows which days uploads were published most often in the current view."
                />
              </div>
              <p className="text-muted mt-1 text-sm leading-6">
                Which days this channel posts most often.
              </p>
            </div>
            <div className="text-right">
              <p className="text-foreground text-lg font-[family:var(--font-display)] font-semibold tracking-[-0.04em]">
                {busiestDay?.label ?? "-"}
              </p>
              <p className="text-muted text-xs">Top day</p>
            </div>
          </div>

          <div className="mt-4">
            {scheduleData.some((item) => item.count > 0) ? (
              <div className="grid grid-cols-7 gap-2 rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] p-3 sm:gap-3 sm:p-4">
                {scheduleData.map((item) => {
                  const isBusiest = busiestDay?.label === item.label;
                  const intensity =
                    item.count === 0
                      ? 0.06
                      : 0.16 + (item.count / maxScheduleCount) * 0.74;

                  return (
                    <div
                      key={item.label}
                      className="flex min-h-[9rem] flex-col justify-between rounded-[18px] border border-[var(--border)] px-1.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition sm:px-2"
                      style={{
                        background: isBusiest
                          ? `linear-gradient(180deg, rgba(124,58,237,${Math.max(intensity, 0.24)}), rgba(124,58,237,0.12))`
                          : `linear-gradient(180deg, rgba(167,139,250,${intensity}), rgba(255,255,255,0.52))`,
                      }}
                    >
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[11px] font-semibold",
                            isBusiest
                              ? "bg-white/85 text-[var(--accent-strong)]"
                              : "bg-white/75 text-[var(--foreground)]",
                          )}
                        >
                          {item.label}
                        </span>
                      </div>

                      <div className="flex flex-1 items-center justify-center">
                        <span
                          className={cn(
                            "text-xl font-[family:var(--font-display)] font-semibold tracking-[-0.04em]",
                            isBusiest
                              ? "text-[var(--accent-strong)]"
                              : "text-[var(--foreground)]",
                          )}
                        >
                          {item.count}
                        </span>
                      </div>

                      <p
                        className={cn(
                          "text-[11px]",
                          isBusiest
                            ? "text-[var(--accent-strong)]/80"
                            : "text-[var(--muted)]",
                        )}
                      >
                        {item.count === 1 ? "upload" : "uploads"}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted flex h-full items-center justify-center text-sm">
                No publish pattern yet.
              </div>
            )}
          </div>

          <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-3">
            <p className="text-muted text-xs">Quick read</p>
            <p className="mt-1 text-sm leading-6 font-medium">
              {busiestDay
                ? `${busiestDay.count} uploads landed on ${busiestDay.label}. ${overview}`
                : overview}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
