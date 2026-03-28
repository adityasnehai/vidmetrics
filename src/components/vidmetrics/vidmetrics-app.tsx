"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type FormEvent,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  AlertCircle,
  ArrowDownUp,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  ExternalLink,
  Flame,
  LoaderCircle,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";

import { ContentAnalysis } from "@/components/vidmetrics/content-analysis";
import { KeywordAnalysis } from "@/components/vidmetrics/keyword-analysis";
import { PerformanceChart } from "@/components/vidmetrics/performance-chart";
import { demoChannelOptions } from "@/lib/mock-data";
import type {
  AnalysisPayload,
  SortKey,
  TrendLabel,
  VideoMetric,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type PatternMetric = {
  label: string;
  value: string;
  detail: string;
  tooltip?: string;
  splitVisual?: {
    shorts: number;
    longVideos: number;
  };
};

type WinningPatterns = {
  summary: string;
  metrics: PatternMetric[];
  insights: Array<{
    title: string;
    detail: string;
  }>;
};

type ChannelScorecard = {
  summary: string;
  metrics: PatternMetric[];
};

type FormatScope = "all" | "shorts" | "videos";

const defaultWindowDays = Number(
  process.env.NEXT_PUBLIC_DEFAULT_WINDOW_DAYS ?? "30",
);
const defaultUploadsLimit = 25;
const videosPerPage = 10;

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const sortLabels: Record<SortKey, string> = {
  performanceScore: "Performance score",
  viewCount: "Views",
  viewsPerDay: "Views per day",
  engagementRate: "Engagement rate",
  publishedAt: "Publish date",
  likeCount: "Likes",
  commentCount: "Comments",
};

function getSortDirectionLabel(sortKey: SortKey, direction: "desc" | "asc") {
  if (sortKey === "publishedAt") {
    return direction === "desc" ? "Newest first" : "Oldest first";
  }

  return direction === "desc" ? "Highest first" : "Lowest first";
}

const trendStyles: Record<TrendLabel, string> = {
  Breakout: "border border-warning bg-warning-surface text-warning-strong",
  Surging: "border border-accent-soft bg-accent-surface text-accent-strong",
  "High Engagement":
    "border border-success bg-success-surface text-success-strong",
  Steady: "border border-border bg-surface-soft text-muted-strong",
};

function formatCompact(value: number) {
  return compactNumber.format(value);
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function getWindowLabel(windowDays: number) {
  switch (windowDays) {
    case 0:
      return "all analyzed videos";
    case 7:
      return "last 7 days";
    case 30:
      return "last 30 days";
    case 90:
      return "last 90 days";
    default:
      return `last ${windowDays} days`;
  }
}

function matchesFormatScope(video: VideoMetric, formatScope: FormatScope) {
  if (formatScope === "all") {
    return true;
  }

  if (formatScope === "shorts") {
    return video.formatLabel === "Short";
  }

  return video.formatLabel !== "Short";
}

function getUploadsControlLabel(formatScope: FormatScope) {
  switch (formatScope) {
    case "shorts":
      return "Recent Shorts";
    case "videos":
      return "Recent long videos";
    default:
      return "Recent videos";
  }
}

function getUploadsOptionLabel(value: number, formatScope: FormatScope) {
  if (value === 0) {
    switch (formatScope) {
      case "shorts":
        return "All Shorts";
      case "videos":
        return "All long videos";
      default:
        return "All videos";
    }
  }

  switch (formatScope) {
    case "shorts":
      return `${value} Shorts`;
    case "videos":
      return `${value} long videos`;
    default:
      return `${value} uploads`;
  }
}

function getBoardScopePrefix(
  formatScope: FormatScope,
  uploadsAnalyzed: number,
) {
  const checkedLabel =
    formatScope === "all"
      ? `${getFormatCountLabel(uploadsAnalyzed, formatScope)} checked (Shorts + long videos)`
      : `${getFormatCountLabel(uploadsAnalyzed, formatScope)} checked`;

  return checkedLabel;
}

function getAnalyzedFormatPhrase(formatScope: FormatScope, count: number) {
  switch (formatScope) {
    case "shorts":
      return `${count} analyzed ${count === 1 ? "Short" : "Shorts"}`;
    case "videos":
      return `${count} analyzed ${count === 1 ? "long video" : "long videos"}`;
    default:
      return `${count} analyzed ${count === 1 ? "video" : "videos"}`;
  }
}

function getStandingOutComparisonPhrase(formatScope: FormatScope) {
  switch (formatScope) {
    case "shorts":
      return "the other Shorts here";
    case "videos":
      return "the other long videos here";
    default:
      return "the other videos here";
  }
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return value === 1 ? singular : plural;
}

function median(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  }

  return sorted[midpoint];
}

function getFormatCountLabel(count: number, formatScope: FormatScope) {
  switch (formatScope) {
    case "shorts":
      return `${count} ${count === 1 ? "Short" : "Shorts"}`;
    case "videos":
      return `${count} ${count === 1 ? "long video" : "long videos"}`;
    default:
      return `${count} ${pluralize(count, "video")}`;
  }
}

function getVideoMetaFormatLabel(video: VideoMetric) {
  return video.formatLabel === "Short" ? "Short" : "Long video";
}

function getInsightFormatLabel(formatLabel: string) {
  return formatLabel === "Short" ? "Short" : "Long video";
}

function sortVideos(
  videos: VideoMetric[],
  sortKey: SortKey,
  direction: "desc" | "asc",
) {
  return [...videos].sort((left, right) => {
    if (sortKey === "publishedAt") {
      const publishedDifference =
        new Date(right.publishedAt).getTime() -
        new Date(left.publishedAt).getTime();

      return direction === "desc"
        ? publishedDifference
        : publishedDifference * -1;
    }

    const valueDifference = right[sortKey] - left[sortKey];
    return direction === "desc" ? valueDifference : valueDifference * -1;
  });
}

function buildCsv(videos: VideoMetric[]) {
  const headers = [
    "Title",
    "Published At",
    "Trend",
    "Format",
    "Duration",
    "Views",
    "Likes",
    "Comments",
    "Views Per Day",
    "Engagement Rate",
    "Performance Score",
    "URL",
  ];

  const rows = videos.map((video) => [
    video.title,
    video.publishedAt,
    video.trend,
    getVideoMetaFormatLabel(video),
    video.duration,
    String(video.viewCount),
    String(video.likeCount),
    String(video.commentCount),
    String(video.viewsPerDay),
    String(video.engagementRate),
    String(video.performanceScore),
    video.videoUrl,
  ]);

  return [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
}

function formatAverageDuration(seconds: number) {
  if (seconds < 75) {
    return `${Math.round(seconds)} sec`;
  }

  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

function buildWinningPatterns(
  videos: VideoMetric[],
  analysis: AnalysisPayload,
  formatScope: FormatScope,
): WinningPatterns | null {
  if (!videos.length) {
    return null;
  }

  const winnersSortedByPerformance = sortVideos(
    videos,
    "performanceScore",
    "desc",
  );
  const winners = winnersSortedByPerformance;
  const formatCounts = winners.reduce<Record<string, number>>(
    (accumulator, video) => {
      accumulator[video.formatLabel] =
        (accumulator[video.formatLabel] ?? 0) + 1;
      return accumulator;
    },
    {},
  );
  const dominantFormatEntry = Object.entries(formatCounts).sort(
    (left, right) => right[1] - left[1],
  )[0] ?? ["Feature", 0];
  const dominantFormat = dominantFormatEntry[0];
  const dominantFormatLabel = getInsightFormatLabel(dominantFormat);
  const dominantFormatShare =
    dominantFormatEntry[1] / Math.max(winners.length, 1);
  const scopeLabel =
    formatScope === "shorts"
      ? "Shorts"
      : formatScope === "videos"
        ? "long videos"
        : "videos";
  const averageDuration =
    winners.reduce((total, video) => total + video.durationSeconds, 0) /
    winners.length;
  const engagementOutlier =
    sortVideos(winners, "engagementRate", "desc")[0] ?? winners[0];
  const fastestVideo =
    sortVideos(winners, "viewsPerDay", "desc")[0] ?? winners[0];
  const risingCount = winners.filter(
    (video) => video.trend === "Breakout" || video.trend === "Surging",
  ).length;

  return {
    summary:
      formatScope === "all"
        ? risingCount >= Math.ceil(winners.length / 2)
          ? `${dominantFormatLabel} appears most often in the strongest videos here, and several uploads are picking up quickly.`
          : `${dominantFormatLabel} appears most often in the strongest videos here, with ${fastestVideo.title} moving fastest right now.`
        : risingCount >= Math.ceil(winners.length / 2)
          ? `${risingCount} of the ${winners.length} ${scopeLabel} shown here are picking up quickly.`
          : `${fastestVideo.title} is moving fastest among the ${scopeLabel} shown here.`,
    metrics: [
      {
        label: formatScope === "all" ? "Top video type" : "View mode",
        value:
          formatScope === "all"
            ? `${dominantFormatLabel} · ${Math.round(dominantFormatShare * 100)}%`
            : formatScope === "shorts"
              ? "Shorts only"
              : "Long video only",
        detail:
          formatScope === "all"
            ? `${dominantFormatEntry[1]} of ${winners.length} videos shown here`
            : `Based on ${winners.length} videos shown here`,
      },
      {
        label: "Typical length",
        value: formatAverageDuration(averageDuration),
        detail: `Average across ${winners.length} videos shown here`,
      },
      {
        label: "Rising videos",
        value: `${risingCount} of ${winners.length}`,
        detail: "Breakout or Surging in the videos shown here",
      },
      {
        label: "Best response",
        value: formatPercent(engagementOutlier.engagementRate),
        detail: `${engagementOutlier.title} gets the strongest audience response`,
      },
    ],
    insights: [
      {
        title: "Fastest mover",
        detail: `${fastestVideo.title} is getting ${formatCompact(
          Math.round(fastestVideo.viewsPerDay),
        )} views per day in this view.`,
      },
      {
        title: formatScope === "all" ? "What is repeating" : "Best response",
        detail:
          formatScope === "all"
            ? `${dominantFormatLabel} appears in ${dominantFormatEntry[1]} of the ${winners.length} videos shown here.`
            : `${engagementOutlier.title} is getting ${formatPercent(
                engagementOutlier.engagementRate,
              )} engagement in this view.`,
      },
    ],
  };
}

function buildChannelScorecard(
  analyzedVideos: VideoMetric[],
  formatScope: FormatScope,
): ChannelScorecard | null {
  if (!analyzedVideos.length) {
    return null;
  }

  const averageViews =
    analyzedVideos.reduce((total, video) => total + video.viewCount, 0) /
    analyzedVideos.length;
  const averageDuration =
    analyzedVideos.reduce((total, video) => total + video.durationSeconds, 0) /
    analyzedVideos.length;
  const shortCount = analyzedVideos.filter(
    (video) => video.formatLabel === "Short",
  ).length;
  const medianViews = median(analyzedVideos.map((video) => video.viewCount));
  const medianViewsPerDay = median(
    analyzedVideos.map((video) => video.viewsPerDay),
  );
  const breakoutCount = analyzedVideos.filter((video) => {
    const beatsViewBaseline = video.viewCount >= medianViews * 1.15;
    const beatsVelocityBaseline = video.viewsPerDay >= medianViewsPerDay * 1.35;

    return beatsViewBaseline || beatsVelocityBaseline;
  }).length;
  const breakoutRate = (breakoutCount / analyzedVideos.length) * 100;
  const shortShare = (shortCount / analyzedVideos.length) * 100;
  const analyzedCount = analyzedVideos.length;
  const analyzedSetLabel = getFormatCountLabel(analyzedCount, formatScope);
  const analyzedFormatPhrase = getAnalyzedFormatPhrase(
    formatScope,
    analyzedCount,
  );
  const comparisonPhrase = getStandingOutComparisonPhrase(formatScope);
  const betterLabel = `${breakoutCount} ${pluralize(
    breakoutCount,
    "video",
  )} ${breakoutCount === 1 ? "is" : "are"} standing out from ${comparisonPhrase}`;
  const modeMetric =
    formatScope === "all"
      ? {
          label: "Shorts in analyzed videos",
          value: `${Math.round(shortShare)}%`,
          detail: `${shortCount} of ${analyzedCount} analyzed videos are Shorts`,
          splitVisual: {
            shorts: shortCount,
            longVideos: Math.max(analyzedCount - shortCount, 0),
          },
        }
      : {
          label: "View mode",
          value: formatScope === "shorts" ? "Shorts only" : "Long video only",
          detail: `Based on ${analyzedSetLabel}`,
        };

  const summary =
    analyzedCount <= 3
      ? `${analyzedSetLabel} ${analyzedCount === 1 ? "was" : "were"} analyzed here. ${betterLabel}.`
      : breakoutRate >= 50
        ? `${breakoutCount} of the ${analyzedFormatPhrase} are standing out from ${comparisonPhrase}. More than one video is contributing.`
        : `${breakoutCount} of the ${analyzedFormatPhrase} are standing out from ${comparisonPhrase}. A few videos are leading the results right now.`;

  return {
    summary,
    metrics: [
      {
        label: "Average views",
        value: formatCompact(Math.round(averageViews)),
        detail: `Across ${analyzedSetLabel}`,
      },
      {
        label: "Standing out",
        value: `${Math.round(breakoutRate)}%`,
        detail: `${breakoutCount} ${pluralize(
          breakoutCount,
          "video",
        )} ${breakoutCount === 1 ? "is" : "are"} standing out from the other analyzed videos`,
        tooltip:
          "We look at all analyzed videos, find the median for views and views per day, and count how many videos are clearly above those levels.",
      },
      modeMetric,
      {
        label: "Average length",
        value: formatAverageDuration(averageDuration),
        detail: "Average length across analyzed videos",
      },
    ],
  };
}

function TrendBadge({ trend }: { trend: TrendLabel }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        trendStyles[trend],
      )}
    >
      {trend}
    </span>
  );
}

function TrendBadgeWithPreview({
  video,
  benchmarks,
  align = "left",
}: {
  video: VideoMetric;
  benchmarks: AnalysisPayload["benchmarks"];
  align?: "left" | "right";
}) {
  const viewsRatio = Math.max(
    0,
    video.viewsPerDay / Math.max(benchmarks.medianViewsPerDay, 1),
  );
  const engagementRatio = Math.max(
    0,
    video.engagementRate / Math.max(benchmarks.medianEngagementRate, 0.75),
  );
  const viewsBar = Math.min(100, Math.max(12, viewsRatio * 42));
  const engagementBar = Math.min(100, Math.max(12, engagementRatio * 42));

  const summary =
    video.trend === "Breakout"
      ? "This video is clearly ahead of most videos here."
      : video.trend === "Surging"
        ? "This video is picking up faster than most videos here."
        : video.trend === "High Engagement"
          ? "People are reacting more strongly to this video than most videos here."
          : "This video is closer to the median range for this board.";

  return (
    <div className="group relative inline-flex">
      <TrendBadge trend={video.trend} />
      <div
        className={cn(
          "border-border bg-surface pointer-events-none absolute top-8 z-20 hidden w-64 rounded-[18px] border p-3 text-left shadow-[0_16px_36px_rgba(15,23,42,0.12)] group-hover:block",
          align === "right" ? "right-0" : "left-0",
        )}
      >
        <p className="text-foreground text-sm font-semibold">{video.trend}</p>
        <p className="text-muted mt-1 text-xs leading-5">{summary}</p>

        <div className="mt-3 space-y-2.5">
          <div className="space-y-1">
            <div className="text-muted flex items-center justify-between text-[11px]">
              <span>Daily views vs median</span>
              <span>{viewsRatio.toFixed(1)}x</span>
            </div>
            <div className="bg-surface-soft h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))]"
                style={{ width: `${viewsBar}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted flex items-center justify-between text-[11px]">
              <span>Audience response vs median</span>
              <span>{engagementRatio.toFixed(1)}x</span>
            </div>
            <div className="bg-surface-soft h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.85),rgba(5,150,105,0.82))]"
                style={{ width: `${engagementBar}%` }}
              />
            </div>
          </div>
        </div>

        <div className="text-muted mt-3 flex items-center justify-between text-[11px]">
          <span>{formatCompact(video.viewsPerDay)} views/day</span>
          <span>{formatPercent(video.engagementRate)} engagement</span>
        </div>
      </div>
    </div>
  );
}

function InfoTooltip({
  label,
  tooltip,
  size = "sm",
  align = "center",
}: {
  label: string;
  tooltip: string;
  size?: "sm" | "md";
  align?: "center" | "right";
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={`How ${label} is calculated`}
        className={cn(
          "text-muted hover:text-foreground inline-flex items-center justify-center rounded-full transition",
          size === "sm" ? "size-4" : "size-5",
        )}
      >
        <CircleHelp className={size === "sm" ? "size-3" : "size-3.5"} />
      </button>
      <div
        className={cn(
          "border-border bg-surface pointer-events-none absolute top-5 z-20 hidden w-64 rounded-[16px] border px-3 py-2.5 text-left text-xs leading-5 text-[var(--muted-strong)] shadow-[0_16px_36px_rgba(15,23,42,0.12)] group-hover:block",
          align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
        )}
      >
        {tooltip}
      </div>
    </div>
  );
}

function MetricHeader({
  label,
  tooltip,
  align,
}: {
  label: string;
  tooltip?: string;
  align?: "center" | "right";
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      {tooltip ? (
        <InfoTooltip label={label} tooltip={tooltip} align={align} />
      ) : null}
    </div>
  );
}

function SectionCard({
  id,
  eyebrow,
  title,
  aside,
  children,
  className,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "bg-surface/88 border-border scroll-mt-28 rounded-[28px] border p-5 shadow-[0_20px_52px_rgba(91,75,138,0.1)] backdrop-blur-sm sm:p-6 lg:p-7",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted font-mono text-[11px] tracking-[0.22em] uppercase">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-[1.35rem] font-[family:var(--font-display)] font-semibold tracking-[-0.03em] sm:text-[1.5rem]">
            {title}
          </h3>
        </div>
        {aside ? <div className="text-muted text-sm">{aside}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({
  isLoading,
  error,
}: {
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <SectionCard eyebrow="Ready" title="Paste a channel to start analysis.">
      {isLoading ? (
        <div className="space-y-4">
          <div className="bg-border h-6 w-44 animate-pulse rounded-full" />
          <div className="bg-border h-14 animate-pulse rounded-3xl" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="bg-border h-32 animate-pulse rounded-[24px]"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="border-accent-soft bg-accent-surface text-accent-strong inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
              <Sparkles className="size-4" />
              Workspace-ready
            </div>
            <p className="text-muted mt-4 text-sm leading-6">
              VidMetrics pulls public YouTube data, ranks recent videos, and
              turns the results into a clear view a strategy team can work
              through.
            </p>
          </div>
          {error ? (
            <div className="border-danger bg-danger-surface text-danger-strong rounded-3xl border px-5 py-4 text-sm">
              {error}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {["Top videos", "Useful patterns", "CSV export"].map((item) => (
                <div
                  key={item}
                  className="border-border bg-surface rounded-[22px] border px-4 py-4 text-sm font-medium"
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

export function VidMetricsApp({
  initialChannelUrl,
}: {
  initialChannelUrl?: string;
}) {
  const initialUrl =
    initialChannelUrl?.trim() ||
    demoChannelOptions[0]?.url ||
    "https://www.youtube.com/@creatorpulse";

  const [channelUrl, setChannelUrl] = useState(initialUrl);
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [windowDays, setWindowDays] = useState(defaultWindowDays);
  const [uploadsLimit, setUploadsLimit] = useState(defaultUploadsLimit);
  const [formatScope, setFormatScope] = useState<FormatScope>("all");
  const [analysisFormatScope, setAnalysisFormatScope] =
    useState<FormatScope>("all");
  const [topVideosFormatScope, setTopVideosFormatScope] =
    useState<FormatScope>("all");
  const [takeawaysFormatScope, setTakeawaysFormatScope] =
    useState<FormatScope>("all");
  const [jumpMenuOpen, setJumpMenuOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("performanceScore");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const lastBootstrappedUrl = useRef<string | null>(null);
  const jumpMenuRef = useRef<HTMLDivElement | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const runBootstrapAnalysis = useEffectEvent((targetUrl: string) => {
    void analyzeChannel(targetUrl, { updateInput: false });
  });

  useEffect(() => {
    if (lastBootstrappedUrl.current === initialUrl) {
      return;
    }

    lastBootstrappedUrl.current = initialUrl;
    setChannelUrl(initialUrl);
    runBootstrapAnalysis(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    if (!jumpMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!jumpMenuRef.current?.contains(event.target as Node)) {
        setJumpMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setJumpMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [jumpMenuOpen]);

  useEffect(() => {
    setTopVideosFormatScope(analysisFormatScope);
  }, [analysisFormatScope]);

  useEffect(() => {
    setTakeawaysFormatScope(analysisFormatScope);
  }, [analysisFormatScope]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    analysis,
    deferredSearch,
    sortKey,
    sortDirection,
    topVideosFormatScope,
    windowDays,
  ]);

  async function analyzeChannel(
    targetUrl: string,
    options?: {
      updateInput?: boolean;
      formatScope?: FormatScope;
      uploadsLimit?: number;
    },
  ) {
    const scopeToAnalyze = options?.formatScope ?? formatScope;
    const uploadsLimitToAnalyze = options?.uploadsLimit ?? uploadsLimit;
    setNetworkLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelUrl: targetUrl,
          uploadsLimit: uploadsLimitToAnalyze,
          formatScope: scopeToAnalyze,
        }),
      });

      const payload = (await response.json()) as AnalysisPayload & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to analyze that channel.");
      }

      startTransition(() => {
        if (options?.updateInput !== false) {
          setChannelUrl(targetUrl);
        }

        setFormatScope(scopeToAnalyze);
        setAnalysisFormatScope(scopeToAnalyze);
        setUploadsLimit(uploadsLimitToAnalyze);
        setAnalysis(payload);
        setError(null);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to analyze that channel right now.",
      );
    } finally {
      setNetworkLoading(false);
    }
  }

  function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void analyzeChannel(channelUrl, { updateInput: false });
  }

  function handleUploadsLimitChange(nextUploadsLimit: number) {
    setUploadsLimit(nextUploadsLimit);

    if (!analysis) {
      return;
    }

    void analyzeChannel(channelUrl, {
      updateInput: false,
      uploadsLimit: nextUploadsLimit,
    });
  }

  const windowVideos =
    analysis?.videos.filter(
      (video) => windowDays === 0 || video.daysSincePublish <= windowDays,
    ) ?? [];
  const analyzedVideos =
    analysis?.videos.filter((video) =>
      matchesFormatScope(video, analysisFormatScope),
    ) ?? [];
  const visibleVideos = windowVideos.filter((video) =>
    matchesFormatScope(video, analysisFormatScope),
  );
  const topVideosVisibleVideos = windowVideos.filter((video) =>
    matchesFormatScope(video, topVideosFormatScope),
  );
  const takeawaysVideos = windowVideos.filter((video) =>
    matchesFormatScope(video, takeawaysFormatScope),
  );
  const filteredVideos = sortVideos(
    topVideosVisibleVideos.filter((video) => {
      const matchesSearch =
        deferredSearch.length === 0 ||
        video.title.toLowerCase().includes(deferredSearch);

      return matchesSearch;
    }),
    sortKey,
    sortDirection,
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredVideos.length / videosPerPage),
  );
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStart = (safeCurrentPage - 1) * videosPerPage;
  const paginatedVideos = filteredVideos.slice(
    pageStart,
    pageStart + videosPerPage,
  );
  const topVideo = visibleVideos[0] ?? null;
  const averageViewsPerDay =
    analyzedVideos.length > 0
      ? analyzedVideos.reduce((total, video) => total + video.viewsPerDay, 0) /
        analyzedVideos.length
      : 0;
  const analyzedTotalViews = analyzedVideos.reduce(
    (total, video) => total + video.viewCount,
    0,
  );
  const analyzedTotalReactions = analyzedVideos.reduce(
    (total, video) => total + video.likeCount + video.commentCount,
    0,
  );
  const averageEngagement =
    analyzedTotalViews > 0
      ? (analyzedTotalReactions / analyzedTotalViews) * 100
      : 0;
  const takeaways =
    analysis && takeawaysVideos.length
      ? buildWinningPatterns(takeawaysVideos, analysis, takeawaysFormatScope)
      : null;
  const windowLabel = getWindowLabel(windowDays);
  const channelScorecard = analysis
    ? buildChannelScorecard(analysis.videos, analysisFormatScope)
    : null;
  const uploadsControlLabel = getUploadsControlLabel(formatScope);
  const boardScopeSummary = analysis
    ? visibleVideos.length > 0
      ? windowDays === 0
        ? getBoardScopePrefix(
            analysisFormatScope,
            analysis.channel.uploadsAnalyzed,
          )
        : `${getBoardScopePrefix(analysisFormatScope, analysis.channel.uploadsAnalyzed)} · ${visibleVideos.length} in ${windowLabel}`
      : windowDays === 0
        ? `${getBoardScopePrefix(analysisFormatScope, analysis.channel.uploadsAnalyzed)} · No videos shown here`
        : `${getBoardScopePrefix(analysisFormatScope, analysis.channel.uploadsAnalyzed)} · No videos in ${windowLabel}`
    : "Analyze a channel to see the current view.";

  function handleFormatScopeChange(nextScope: FormatScope) {
    if (nextScope === formatScope) {
      return;
    }

    setFormatScope(nextScope);

    if (analysis) {
      void analyzeChannel(channelUrl, {
        updateInput: false,
        formatScope: nextScope,
      });
    }
  }

  function handleExport() {
    if (!filteredVideos.length) {
      return;
    }

    const blob = new Blob([buildCsv(filteredVideos)], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const scopeLabel =
      topVideosFormatScope === "all"
        ? "all"
        : topVideosFormatScope === "shorts"
          ? "shorts"
          : "long";
    const windowExportLabel = windowDays === 0 ? "all" : `${windowDays}d`;

    link.href = url;
    link.download = `${analysis?.channel.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") ?? "vidmetrics"}-${scopeLabel}-${windowExportLabel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleJumpToSection(sectionId: string) {
    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setJumpMenuOpen(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mb-5 rounded-[22px] border border-[rgba(124,58,237,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(248,243,252,0.88))] px-4 py-3.5 shadow-[0_18px_44px_rgba(91,75,138,0.08)] backdrop-blur-sm sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[linear-gradient(180deg,#A855F7,#7C3AED)] shadow-[0_0_12px_rgba(124,58,237,0.18)]" />
              <p className="text-base font-[family:var(--font-display)] font-semibold tracking-[-0.04em] sm:text-[1.15rem]">
                <span className="text-foreground">Vid</span>
                <span className="bg-[linear-gradient(180deg,#8B5CF6,#6D28D9)] bg-clip-text text-transparent">
                  Metrics
                </span>
              </p>
            </div>
            <p className="text-muted mt-1 text-sm">Competitor research view</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="border-border bg-surface text-muted-strong hover:bg-surface-soft hover:text-foreground rounded-full border px-3.5 py-2 text-xs font-semibold transition"
            >
              Home
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <section className="border-border bg-surface/88 relative z-20 overflow-visible rounded-[24px] border px-4 py-4 shadow-[0_18px_42px_rgba(91,75,138,0.08)] backdrop-blur-sm sm:px-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-muted font-mono text-[11px] tracking-[0.24em] uppercase">
                Analyze
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="text-[1.2rem] font-[family:var(--font-display)] font-semibold tracking-[-0.035em] sm:text-[1.3rem]">
                  Analyze channel
                </h2>
                <div className="relative" ref={jumpMenuRef}>
                  <button
                    type="button"
                    onClick={() => setJumpMenuOpen((open) => !open)}
                    disabled={!analysis}
                    className="border-border bg-surface text-muted-strong hover:bg-surface-soft hover:text-foreground inline-flex min-h-9 items-center gap-1.5 rounded-[14px] border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Jump to
                    <ChevronDown
                      className={cn(
                        "size-4 transition",
                        jumpMenuOpen ? "rotate-180" : "",
                      )}
                    />
                  </button>

                  {jumpMenuOpen && analysis ? (
                    <div className="border-border bg-surface absolute top-11 left-0 z-50 min-w-52 rounded-[18px] border p-2 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                      {[
                        ["overview", "Channel information"],
                        ["videos", "Top videos"],
                        ["content-analysis", "Content analysis"],
                        ["keyword-analysis", "Keyword analysis"],
                        ["charts", "Performance chart"],
                        ["takeaways", "Competitor takeaways"],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleJumpToSection(id)}
                          className="text-foreground hover:bg-surface-soft flex w-full items-center rounded-[12px] px-3 py-2 text-left text-sm transition"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <form onSubmit={handleAnalyze} className="w-full">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.95fr)_220px_170px] lg:items-stretch">
                <div className="border-border bg-surface-soft flex min-h-[72px] flex-col justify-center rounded-[18px] border px-4 py-3 text-sm">
                  <span className="text-muted mb-1.5 block font-mono text-[11px] tracking-[0.16em] uppercase">
                    Channel URL
                  </span>
                  <div className="flex items-center gap-3">
                    <Search className="text-muted size-4 shrink-0" />
                    <input
                      value={channelUrl}
                      onChange={(event) => setChannelUrl(event.target.value)}
                      placeholder="https://www.youtube.com/@creatorpulse"
                      className="clean-url-input placeholder:text-muted w-full appearance-none bg-transparent text-sm ring-0 outline-none focus:ring-0 focus:outline-none focus-visible:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={networkLoading}
                      className="border-accent-soft/70 bg-accent/12 text-accent-strong hover:bg-accent/16 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[14px] border px-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {networkLoading ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Analyzing
                        </>
                      ) : (
                        <>
                          Analyze
                          <ArrowUpRight className="size-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="border-border bg-surface flex min-h-[72px] flex-col justify-center rounded-[18px] border px-3 py-3 text-sm">
                  <span className="text-muted mb-1.5 block font-mono text-[11px] tracking-[0.16em] uppercase">
                    View mode
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ["all", "All"],
                        ["shorts", "Shorts"],
                        ["videos", "Long"],
                      ] as Array<[FormatScope, string]>
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleFormatScopeChange(value)}
                        className={cn(
                          "min-h-8 rounded-[14px] px-2 py-1.5 text-sm font-medium transition",
                          formatScope === value
                            ? "bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] text-white shadow-[0_10px_20px_rgba(91,33,182,0.12)]"
                            : "bg-surface-soft text-muted-strong hover:bg-accent-surface hover:text-accent-strong",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="border-border bg-surface flex min-h-[72px] flex-col justify-center rounded-[18px] border px-4 py-3 text-sm">
                  <span className="text-muted mb-1.5 block font-mono text-[11px] tracking-[0.16em] uppercase">
                    {uploadsControlLabel}
                  </span>
                  <select
                    value={uploadsLimit}
                    onChange={(event) =>
                      handleUploadsLimitChange(Number(event.target.value))
                    }
                    className="w-full bg-transparent text-sm outline-none"
                  >
                    {[25, 50, 100].map((value) => (
                      <option key={value} value={value}>
                        {getUploadsOptionLabel(value, formatScope)}
                      </option>
                    ))}
                    <option value={0}>
                      {getUploadsOptionLabel(0, formatScope)}
                    </option>
                  </select>
                </label>
              </div>
            </form>
          </div>
        </section>

        <div className="space-y-6">
          {!analysis ? (
            <EmptyState isLoading={networkLoading || isPending} error={error} />
          ) : (
            <>
              {analysis.note ? (
                <div className="border-accent-soft bg-accent-surface rounded-[24px] border px-5 py-4 text-sm shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-accent-strong mt-0.5 size-4 shrink-0" />
                    <p className="text-accent-strong leading-6">
                      {analysis.note}
                    </p>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="border-danger bg-danger-surface text-danger-strong rounded-[24px] border px-5 py-4 text-sm">
                  {error}
                </div>
              ) : null}

              <SectionCard
                id="overview"
                eyebrow="Channel information"
                title={analysis.channel.title}
              >
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-4">
                      <Image
                        src={analysis.channel.avatarUrl}
                        alt={`${analysis.channel.title} avatar`}
                        width={68}
                        height={68}
                        unoptimized
                        className="border-border h-[68px] w-[68px] rounded-[22px] border object-cover shadow-[0_12px_24px_rgba(91,75,138,0.08)]"
                      />
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="border-border bg-surface-soft text-muted-strong rounded-full border px-2.5 py-1 text-xs">
                            {analysis.channel.handle}
                          </span>
                          {[
                            [
                              "Subscribers",
                              formatCompact(analysis.channel.subscriberCount),
                            ],
                            [
                              "Total videos",
                              formatCompact(analysis.channel.videoCount),
                            ],
                            [
                              "Videos analyzed",
                              String(analysis.channel.uploadsAnalyzed),
                            ],
                          ].map(([label, value]) => (
                            <span
                              key={label}
                              className="border-border bg-surface text-muted-strong rounded-full border px-2.5 py-1 text-xs"
                            >
                              {label}: {value}
                            </span>
                          ))}
                        </div>

                        <p className="text-muted-strong max-w-3xl text-sm leading-6">
                          {boardScopeSummary}
                        </p>
                      </div>
                    </div>

                    <a
                      href={analysis.channel.channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="border-border bg-surface text-foreground hover:bg-surface-soft inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] border px-4 py-2.5 text-sm font-semibold transition"
                    >
                      Open channel
                      <ExternalLink className="size-4" />
                    </a>
                  </div>

                  <div className="border-border bg-surface-soft rounded-[22px] border p-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Overview</p>
                      <div className="group relative">
                        <button
                          type="button"
                          aria-label="How overview is calculated"
                          className="text-muted hover:text-foreground inline-flex size-5 items-center justify-center rounded-full transition"
                        >
                          <CircleHelp className="size-3.5" />
                        </button>
                        <div className="border-border bg-surface pointer-events-none absolute top-6 left-1/2 z-20 hidden w-64 -translate-x-1/2 rounded-[16px] border px-3 py-2.5 text-left text-xs leading-5 text-[var(--muted-strong)] shadow-[0_16px_36px_rgba(15,23,42,0.12)] group-hover:block">
                          We look at all analyzed videos, find the median for
                          views and views per day, and count how many videos are
                          clearly above those levels.
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-strong mt-2 text-sm leading-7">
                      {channelScorecard?.summary ??
                        "Analyze a channel to build the competitor scorecard."}
                    </p>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
                    {(channelScorecard?.metrics ?? []).map((metric) => (
                      <div
                        key={metric.label}
                        className="border-border bg-surface rounded-[20px] border px-4 py-4"
                      >
                        <div className="flex items-center gap-1.5">
                          <p className="text-muted font-mono text-[11px] tracking-[0.18em] uppercase">
                            {metric.label}
                          </p>
                          {metric.tooltip ? (
                            <InfoTooltip
                              label={metric.label}
                              tooltip={metric.tooltip}
                            />
                          ) : null}
                        </div>
                        <p className="mt-2.5 text-[1.65rem] font-[family:var(--font-display)] font-semibold tracking-[-0.04em]">
                          {metric.value}
                        </p>
                        <p className="text-muted mt-2 text-sm leading-6">
                          {metric.detail}
                        </p>
                        {metric.splitVisual ? (
                          <div className="mt-3 space-y-2">
                            <div className="bg-surface-soft flex h-2 overflow-hidden rounded-full">
                              <div
                                className="rounded-full bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))]"
                                style={{
                                  width: `${(metric.splitVisual.shorts / Math.max(metric.splitVisual.shorts + metric.splitVisual.longVideos, 1)) * 100}%`,
                                }}
                              />
                              <div
                                className="bg-border"
                                style={{
                                  width: `${(metric.splitVisual.longVideos / Math.max(metric.splitVisual.shorts + metric.splitVisual.longVideos, 1)) * 100}%`,
                                }}
                              />
                            </div>
                            <div className="text-muted flex items-center justify-between text-xs">
                              <span>Shorts {metric.splitVisual.shorts}</span>
                              <span>
                                Videos {metric.splitVisual.longVideos}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
                    {[
                      {
                        label: "Top video",
                        value: topVideo
                          ? formatCompact(topVideo.viewCount)
                          : "-",
                        meta: topVideo ? topVideo.title : "No videos in range",
                        icon: Trophy,
                        href: topVideo?.videoUrl,
                      },
                      {
                        label: "Average views per day",
                        value: formatCompact(Math.round(averageViewsPerDay)),
                        meta: `Across ${analyzedVideos.length} analyzed videos`,
                        icon: TrendingUp,
                      },
                      {
                        label: "Average engagement",
                        value: formatPercent(averageEngagement),
                        meta: `Across ${analyzedVideos.length} analyzed videos`,
                        icon: Users,
                        tooltip:
                          "We add likes and comments across all analyzed videos, divide by total views, and show that as a percentage.",
                      },
                      {
                        label: "Upload pace",
                        value:
                          analyzedVideos.length > 1 &&
                          analysis.benchmarks.uploadCadenceDays > 0
                            ? `Every ${analysis.benchmarks.uploadCadenceDays} days`
                            : "Need more videos",
                        meta:
                          analyzedVideos.length > 1
                            ? `Based on ${analyzedVideos.length} analyzed videos`
                            : "Need at least 2 analyzed videos",
                        icon: Flame,
                        tooltip:
                          "We sort the analyzed videos by publish date, measure the gap between uploads, and average those gaps in days.",
                      },
                    ].map((metric) => (
                      <div
                        key={metric.label}
                        className="border-border bg-surface rounded-[20px] border px-4 py-4"
                      >
                        <div className="text-muted flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5">
                            <span>{metric.label}</span>
                            {metric.tooltip ? (
                              <div className="group relative">
                                <button
                                  type="button"
                                  aria-label={`How ${metric.label} is calculated`}
                                  className="text-muted hover:text-foreground inline-flex size-4 items-center justify-center rounded-full transition"
                                >
                                  <CircleHelp className="size-3" />
                                </button>
                                <div className="border-border bg-surface pointer-events-none absolute top-5 left-1/2 z-20 hidden w-64 -translate-x-1/2 rounded-[16px] border px-3 py-2.5 text-left text-xs leading-5 text-[var(--muted-strong)] shadow-[0_16px_36px_rgba(15,23,42,0.12)] group-hover:block">
                                  {metric.tooltip}
                                </div>
                              </div>
                            ) : null}
                          </div>
                          <span className="bg-accent-surface text-accent-strong flex size-8 items-center justify-center rounded-2xl">
                            <metric.icon className="size-4" />
                          </span>
                        </div>
                        <p className="mt-3 text-[1.65rem] font-[family:var(--font-display)] font-semibold tracking-[-0.04em]">
                          {metric.value}
                        </p>
                        <p className="text-muted mt-2 text-sm leading-6">
                          {metric.meta}
                        </p>
                        {metric.href ? (
                          <a
                            href={metric.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent-strong mt-2 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                          >
                            Open video
                            <ExternalLink className="size-3.5" />
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                id="videos"
                eyebrow="Top videos"
                title="Which videos are winning now"
              >
                <p className="text-muted max-w-2xl text-sm leading-6">
                  Sort this list by views, pace, engagement, or date. Then flip
                  the order to see higher or lower results, newer uploads, or
                  older ones.
                </p>

                <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_repeat(3,minmax(0,0.62fr))_auto]">
                  <label className="border-border bg-surface flex min-h-12 items-center gap-3 rounded-[20px] border px-4 py-3 text-sm">
                    <Search className="text-muted size-4 shrink-0" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search title"
                      className="placeholder:text-muted w-full bg-transparent outline-none"
                    />
                  </label>

                  <label className="border-border bg-surface min-h-12 rounded-[20px] border px-4 py-3 text-sm">
                    <span className="text-muted mb-1 block font-mono text-[11px] tracking-[0.16em] uppercase">
                      Window
                    </span>
                    <select
                      value={windowDays}
                      onChange={(event) =>
                        setWindowDays(Number(event.target.value))
                      }
                      className="w-full bg-transparent outline-none"
                    >
                      <option value={0}>All</option>
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                  </label>

                  <label className="border-border bg-surface min-h-12 rounded-[20px] border px-4 py-3 text-sm">
                    <span className="text-muted mb-1 block font-mono text-[11px] tracking-[0.16em] uppercase">
                      Sort
                    </span>
                    <select
                      value={sortKey}
                      onChange={(event) =>
                        setSortKey(event.target.value as SortKey)
                      }
                      className="w-full bg-transparent outline-none"
                    >
                      {Object.entries(sortLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="border-border bg-surface min-h-12 rounded-[20px] border px-4 py-3 text-sm">
                    <span className="text-muted mb-1 block font-mono text-[11px] tracking-[0.16em] uppercase">
                      View mode
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ["all", "All"],
                          ["shorts", "Shorts"],
                          ["videos", "Long"],
                        ] as Array<[FormatScope, string]>
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTopVideosFormatScope(value)}
                          className={cn(
                            "min-h-8 rounded-[14px] px-2 py-1.5 text-sm font-medium transition",
                            topVideosFormatScope === value
                              ? "bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] text-white shadow-[0_10px_20px_rgba(91,33,182,0.12)]"
                              : "bg-surface-soft text-muted-strong hover:bg-accent-surface hover:text-accent-strong",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSortDirection((current) =>
                        current === "desc" ? "asc" : "desc",
                      )
                    }
                    className="border-border bg-surface text-muted-strong hover:border-accent-soft hover:bg-accent-surface hover:text-accent-strong inline-flex min-h-12 items-center justify-center gap-2 rounded-[20px] border px-4 py-3 text-sm font-medium transition"
                  >
                    <ArrowDownUp className="size-4" />
                    {getSortDirectionLabel(sortKey, sortDirection)}
                  </button>

                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={!filteredVideos.length}
                    className="border-border bg-surface text-foreground hover:bg-surface-soft inline-flex min-h-12 items-center justify-center gap-2 rounded-[20px] border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                    title="Exports all filtered videos, not just the current page."
                  >
                    <Download className="size-4" />
                    Export CSV
                  </button>
                </div>

                {filteredVideos.length ? (
                  <p className="text-muted mt-3 text-sm leading-6">
                    Export CSV includes all filtered videos, not just the
                    current page.
                  </p>
                ) : null}

                <div className="mt-6 space-y-4">
                  <div className="border-border hidden overflow-x-auto rounded-[24px] border xl:block">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-surface-soft text-muted">
                        <tr>
                          <th className="px-4 py-3 font-medium">Video</th>
                          <th className="px-4 py-3 font-medium">Views</th>
                          <th className="px-4 py-3 font-medium">Likes</th>
                          <th className="px-4 py-3 font-medium">Comments</th>
                          <th className="px-4 py-3 font-medium">
                            <MetricHeader
                              label="Views/day"
                              tooltip="Views per day uses the current total views divided by how many days have passed since publish."
                            />
                          </th>
                          <th className="px-4 py-3 font-medium">
                            <MetricHeader
                              label="Engagement"
                              tooltip="Engagement rate is likes plus comments, divided by views, shown as a percentage."
                            />
                          </th>
                          <th className="px-4 py-3 font-medium">
                            <MetricHeader
                              label="Score"
                              tooltip="Performance score combines daily pace, engagement rate, total views, and recency into one relative ranking."
                              align="right"
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedVideos.map((video) => (
                          <tr
                            key={video.id}
                            className="border-border bg-surface hover:bg-surface-soft border-t transition"
                          >
                            <td className="px-4 py-5">
                              <div className="flex items-start gap-3">
                                <Image
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  width={224}
                                  height={128}
                                  unoptimized
                                  className="h-16 w-28 rounded-2xl object-cover"
                                />
                                <div className="max-w-sm">
                                  <div className="flex items-start gap-2">
                                    <p className="leading-6 font-semibold">
                                      {video.title}
                                    </p>
                                    <a
                                      href={video.videoUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                      className="text-muted hover:text-foreground mt-0.5 inline-flex shrink-0 transition"
                                      aria-label={`Open ${video.title} on YouTube`}
                                    >
                                      <ExternalLink className="size-3.5" />
                                    </a>
                                  </div>
                                  <div className="text-muted mt-1 flex flex-wrap gap-3 text-xs">
                                    <span>
                                      {format(
                                        parseISO(video.publishedAt),
                                        "MMM d",
                                      )}
                                    </span>
                                    <span>
                                      {getVideoMetaFormatLabel(video)}
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    <TrendBadgeWithPreview
                                      video={video}
                                      benchmarks={analysis.benchmarks}
                                    />
                                  </div>
                                  <div className="text-muted mt-2 flex flex-wrap items-center gap-3 text-xs">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Clock3 className="size-3.5" />
                                      {video.duration}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-5 font-medium">
                              {formatCompact(video.viewCount)}
                            </td>
                            <td className="px-4 py-5">
                              {formatCompact(video.likeCount)}
                            </td>
                            <td className="px-4 py-5">
                              {formatCompact(video.commentCount)}
                            </td>
                            <td className="px-4 py-5">
                              {formatCompact(video.viewsPerDay)}
                            </td>
                            <td className="px-4 py-5">
                              {formatPercent(video.engagementRate)}
                            </td>
                            <td className="px-4 py-5">
                              {video.performanceScore}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 xl:hidden">
                    {paginatedVideos.map((video) => (
                      <div
                        key={video.id}
                        className="border-border bg-surface block w-full rounded-[24px] border p-4 text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Image
                            src={video.thumbnailUrl}
                            alt={video.title}
                            width={256}
                            height={160}
                            unoptimized
                            className="h-auto w-full rounded-2xl object-cover sm:h-20 sm:w-32"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <p className="leading-6 font-semibold">
                                {video.title}
                              </p>
                              <a
                                href={video.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                                className="text-muted hover:text-foreground mt-0.5 inline-flex shrink-0 transition"
                                aria-label={`Open ${video.title} on YouTube`}
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            </div>
                            <div className="text-muted mt-2 flex flex-wrap gap-2 text-xs">
                              <span>
                                {format(parseISO(video.publishedAt), "MMM d")}
                              </span>
                              <span>{getVideoMetaFormatLabel(video)}</span>
                            </div>
                            <div className="mt-2">
                              <TrendBadgeWithPreview
                                video={video}
                                benchmarks={analysis.benchmarks}
                                align="right"
                              />
                            </div>
                            <div className="text-muted mt-2 flex flex-wrap items-center gap-3 text-xs">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="size-3.5" />
                                {video.duration}
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                              <p>Views: {formatCompact(video.viewCount)}</p>
                              <p>Likes: {formatCompact(video.likeCount)}</p>
                              <p>
                                Comments: {formatCompact(video.commentCount)}
                              </p>
                              <p>
                                Views/day: {formatCompact(video.viewsPerDay)}
                              </p>
                              <p>
                                Engagement:{" "}
                                {formatPercent(video.engagementRate)}
                              </p>
                              <p>Score: {video.performanceScore}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredVideos.length ? (
                    <div className="border-border bg-surface flex flex-col gap-3 rounded-[24px] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted text-sm">
                        Showing {pageStart + 1}-
                        {Math.min(
                          pageStart + videosPerPage,
                          filteredVideos.length,
                        )}{" "}
                        of {filteredVideos.length} videos
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage((page) => Math.max(1, page - 1))
                          }
                          disabled={safeCurrentPage === 1}
                          className="border-border bg-surface-soft text-muted-strong hover:bg-accent-surface hover:text-accent-strong inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[16px] border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft className="size-4" />
                          Prev
                        </button>
                        <div className="text-muted-strong px-2 text-sm font-medium">
                          Page {safeCurrentPage} of {pageCount}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage((page) =>
                              Math.min(pageCount, page + 1),
                            )
                          }
                          disabled={safeCurrentPage === pageCount}
                          className="border-border bg-surface-soft text-muted-strong hover:bg-accent-surface hover:text-accent-strong inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[16px] border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {!filteredVideos.length ? (
                    <div className="border-border bg-surface text-muted rounded-[24px] border px-5 py-6 text-sm">
                      No videos match the current filters. Try switching the
                      view mode, widening the date window, or clearing the
                      search.
                    </div>
                  ) : null}
                </div>
              </SectionCard>

              <SectionCard
                id="content-analysis"
                eyebrow="Content analysis"
                title="Length and publish timing"
                aside={`${visibleVideos.length} videos in view`}
              >
                <ContentAnalysis
                  videos={visibleVideos}
                  formatScope={analysisFormatScope}
                />
              </SectionCard>

              <SectionCard
                id="keyword-analysis"
                eyebrow="Keyword analysis"
                title="Repeated words and categories"
                aside={`${visibleVideos.length} videos in view`}
              >
                <KeywordAnalysis
                  videos={visibleVideos}
                  formatScope={analysisFormatScope}
                />
              </SectionCard>

              <section
                id="charts"
                className="grid scroll-mt-28 items-start gap-6 xl:grid-cols-[1.12fr_0.88fr]"
              >
                <SectionCard eyebrow="Charts" title="Performance chart">
                  <PerformanceChart
                    videos={analyzedVideos}
                    formatScope={analysisFormatScope}
                  />
                </SectionCard>

                <SectionCard
                  id="takeaways"
                  eyebrow="Insights"
                  title="Competitor takeaways"
                  className="h-fit"
                >
                  <div className="space-y-4">
                    <div className="border-border bg-surface inline-flex rounded-[18px] border p-1">
                      {(
                        [
                          ["all", "All"],
                          ["shorts", "Shorts"],
                          ["videos", "Long video"],
                        ] as Array<[FormatScope, string]>
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTakeawaysFormatScope(value)}
                          className={cn(
                            "min-h-9 rounded-[14px] px-3 py-1.5 text-sm font-medium transition",
                            takeawaysFormatScope === value
                              ? "bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] text-white shadow-[0_10px_20px_rgba(91,33,182,0.12)]"
                              : "text-muted-strong hover:bg-accent-surface hover:text-accent-strong",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {takeaways ? (
                      <div className="border-border bg-surface-soft rounded-[22px] border p-4">
                        <p className="text-sm font-semibold">Quick read</p>
                        <p className="text-muted-strong mt-2 text-sm leading-7">
                          {takeaways.summary}
                        </p>
                      </div>
                    ) : null}

                    {takeaways?.metrics?.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {takeaways.metrics.slice(0, 4).map((metric) => (
                          <div
                            key={metric.label}
                            className="border-border bg-surface rounded-[20px] border px-4 py-4"
                          >
                            <p className="text-muted font-mono text-[11px] tracking-[0.18em] uppercase">
                              {metric.label}
                            </p>
                            <p className="mt-2.5 text-xl font-[family:var(--font-display)] font-semibold tracking-[-0.04em]">
                              {metric.value}
                            </p>
                            <p className="text-muted mt-2 text-sm leading-6">
                              {metric.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {takeaways?.insights?.length ? (
                      <div className="border-border bg-surface rounded-[22px] border p-4">
                        <p className="text-sm font-semibold">What to notice</p>
                        <div className="mt-3 space-y-3">
                          {takeaways.insights.slice(0, 2).map((insight) => (
                            <div key={insight.title} className="flex gap-3">
                              <div className="mt-2 size-2 rounded-full bg-[var(--accent)]" />
                              <div>
                                <p className="text-sm font-semibold">
                                  {insight.title}
                                </p>
                                <p className="text-muted mt-1 text-sm leading-6">
                                  {insight.detail}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {!takeaways ? (
                      <div className="text-muted text-sm leading-6">
                        Analyze a channel to surface useful insights and
                        patterns.
                      </div>
                    ) : null}
                  </div>
                </SectionCard>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
