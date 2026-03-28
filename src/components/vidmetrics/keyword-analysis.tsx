"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { VideoMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

type KeywordViewMode = "all" | "shorts" | "videos";

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const stopWords = new Set([
  "about",
  "after",
  "also",
  "because",
  "being",
  "channel",
  "channels",
  "creator",
  "creators",
  "does",
  "from",
  "into",
  "just",
  "more",
  "most",
  "over",
  "really",
  "should",
  "still",
  "than",
  "that",
  "their",
  "there",
  "these",
  "this",
  "those",
  "through",
  "using",
  "video",
  "videos",
  "watch",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "your",
  "youtube",
]);

function normalizeKeywordTerm(term: string) {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywordTerms(text: string) {
  return normalizeKeywordTerm(text)
    .split(" ")
    .filter((word) => word.length >= 3 && !stopWords.has(word));
}

function collectKeywordCounts(videos: VideoMetric[]) {
  const titleCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  for (const video of videos) {
    const uniqueTitleTerms = new Set<string>(extractKeywordTerms(video.title));
    const uniqueTagTerms = new Set<string>(
      (video.tags ?? []).flatMap((tag) => extractKeywordTerms(tag)),
    );

    for (const term of uniqueTitleTerms) {
      titleCounts.set(term, (titleCounts.get(term) ?? 0) + 1);
    }

    for (const term of uniqueTagTerms) {
      if (uniqueTitleTerms.has(term)) {
        continue;
      }

      tagCounts.set(term, (tagCounts.get(term) ?? 0) + 1);
    }
  }

  const titleResults = [...titleCounts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      share: (count / Math.max(videos.length, 1)) * 100,
    }))
    .filter((item) => item.count >= 2)
    .sort((left, right) => right.count - left.count);

  if (titleResults.length >= 4) {
    return titleResults;
  }

  const usedLabels = new Set(titleResults.map((item) => item.label));
  const tagFallback = [...tagCounts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      share: (count / Math.max(videos.length, 1)) * 100,
    }))
    .filter(
      (item) =>
        item.count >= 2 && item.share <= 75 && !usedLabels.has(item.label),
    )
    .sort((left, right) => right.count - left.count);

  return [...titleResults, ...tagFallback];
}

function collectCategoryCounts(videos: VideoMetric[]) {
  const counts = new Map<string, number>();
  let labeledVideos = 0;

  for (const video of videos) {
    const label = video.categoryLabel?.trim();

    if (!label) {
      continue;
    }

    labeledVideos += 1;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      share: (count / Math.max(labeledVideos, 1)) * 100,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
}

function InfoTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={`How ${label} is derived`}
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

function KeywordTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0];

  return (
    <div className="border-border bg-surface-strong min-w-40 rounded-2xl border px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-sm">
        {point.name}: {compactNumber.format(point.value)}
      </p>
    </div>
  );
}

const categoryColors = [
  "#7C3AED",
  "#A78BFA",
  "#8B5CF6",
  "#C4B5FD",
  "#5B21B6",
  "#DDD6FE",
];

export function KeywordAnalysis({
  videos,
  formatScope,
}: {
  videos: VideoMetric[];
  formatScope: KeywordViewMode;
}) {
  const [viewMode, setViewMode] = useState<KeywordViewMode>(formatScope);

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

  const recurringKeywords = useMemo(
    () => collectKeywordCounts(scopedVideos),
    [scopedVideos],
  );
  const keywordLeaders = recurringKeywords.slice(0, 6);
  const categoryMix = useMemo(
    () => collectCategoryCounts(scopedVideos),
    [scopedVideos],
  );
  const topKeyword = recurringKeywords[0] ?? null;
  const leadingCategory = categoryMix[0] ?? null;
  const maxKeywordCount = Math.max(
    ...keywordLeaders.map((item) => item.count),
    1,
  );
  const labeledCategoryVideoCount = categoryMix.reduce(
    (total, item) => total + item.count,
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted max-w-xl text-sm leading-6">
          See which words repeat most often and which YouTube categories show up
          most in this view.
        </p>

        <div className="border-border bg-surface flex rounded-[18px] border p-1">
          {(
            [
              ["all", "All"],
              ["shorts", "Shorts"],
              ["videos", "Long video"],
            ] as Array<[KeywordViewMode, string]>
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

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="border-border rounded-[24px] border bg-[linear-gradient(180deg,var(--surface),var(--surface-soft))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold">Repeated words</p>
                <InfoTooltip
                  label="Repeated words"
                  tooltip="We first count repeated words in video titles, remove common filler words, and count each word once per video. If titles do not give enough repeated terms, we use public tags as a light fallback."
                />
              </div>
              <p className="text-muted mt-1 text-sm leading-6">
                Repeated title words here.
              </p>
            </div>
            <div className="pt-0.5 text-right">
              <p className="text-foreground text-base font-[family:var(--font-display)] font-semibold tracking-[-0.04em]">
                {topKeyword?.label ?? "-"}
              </p>
              <p className="text-muted mt-0.5 text-[11px]">Top term</p>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] p-3.5">
            {keywordLeaders.length ? (
              <div className="space-y-2.5">
                {keywordLeaders.map((item, index) => {
                  const width = Math.max(
                    18,
                    Math.round((item.count / maxKeywordCount) * 100),
                  );

                  return (
                    <div
                      key={item.label}
                      className="grid grid-cols-[minmax(0,1fr)_3.25rem] items-center gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium text-[var(--foreground)]">
                            {index + 1}. {item.label}
                          </p>
                          <p className="text-[11px] text-[var(--muted)]">
                            {item.share.toFixed(0)}%
                          </p>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[rgba(124,58,237,0.10)]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(124,58,237,0.82),rgba(167,139,250,0.72))]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-accent-surface text-accent-strong rounded-full border border-[var(--accent-soft)] px-2 py-1 text-center text-[11px] font-semibold">
                        {item.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted flex min-h-[10rem] items-center justify-center text-sm">
                Not enough repeated title or tag terms here yet.
              </div>
            )}
          </div>
        </div>

        <div className="border-border rounded-[24px] border bg-[linear-gradient(180deg,var(--surface),var(--surface-soft))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold">Categories</p>
                <InfoTooltip
                  label="Categories"
                  tooltip="We use YouTube's category label for each video, count how often each category appears, and rank the categories that show up most in this view."
                />
              </div>
              <p className="text-muted mt-1 text-sm leading-6">
                YouTube categories here.
              </p>
            </div>
            <div className="pt-0.5 text-right">
              <p className="text-foreground text-base font-[family:var(--font-display)] font-semibold tracking-[-0.04em]">
                {leadingCategory?.label ?? "-"}
              </p>
              <p className="text-muted mt-0.5 text-[11px]">Top category</p>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] p-3.5">
            {categoryMix.length ? (
              <div className="space-y-4">
                <div className="mx-auto h-[176px] w-full max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryMix}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={42}
                        outerRadius={72}
                        paddingAngle={3}
                        stroke="rgba(255,255,255,0.92)"
                        strokeWidth={2}
                      >
                        {categoryMix.map((item, index) => (
                          <Cell
                            key={item.label}
                            fill={categoryColors[index % categoryColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<KeywordTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5">
                  {categoryMix.map((item, index) => (
                    <div
                      key={item.label}
                      className="grid grid-cols-[minmax(0,1fr)_3rem_2.75rem] items-center gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                categoryColors[index % categoryColors.length],
                            }}
                          />
                          <p className="truncate text-sm font-medium text-[var(--foreground)]">
                            {item.label}
                          </p>
                        </div>
                      </div>
                      <p className="text-right text-[11px] text-[var(--muted)]">
                        {item.share.toFixed(0)}%
                      </p>
                      <div className="bg-accent-surface text-accent-strong rounded-full border border-[var(--accent-soft)] px-2 py-1 text-center text-[11px] font-semibold">
                        {item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-muted flex min-h-[10rem] items-center justify-center text-sm">
                Category data is not available here.
              </div>
            )}
          </div>

          <p className="text-muted mt-3 text-sm leading-6">
            {leadingCategory
              ? `${leadingCategory.label} appears most often here. Based on ${labeledCategoryVideoCount} videos with category labels.`
              : "YouTube did not return enough category information here."}
          </p>
        </div>
      </div>
    </div>
  );
}
