import type {
  AnalysisBenchmarks,
  AnalysisPayload,
  AnalysisSource,
  ChannelSummary,
  RawVideoInput,
  TrendLabel,
  VideoMetric,
} from "@/lib/types";

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
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

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function compactDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function detectFormatLabel(title: string, durationSeconds: number) {
  const normalizedTitle = title.toLowerCase();

  if (durationSeconds <= 75) {
    return "Short";
  }

  if (
    normalizedTitle.includes("interview") ||
    normalizedTitle.includes("podcast") ||
    normalizedTitle.includes("conversation")
  ) {
    return "Interview";
  }

  if (
    normalizedTitle.includes("update") ||
    normalizedTitle.includes("news") ||
    normalizedTitle.includes("this week")
  ) {
    return "News";
  }

  if (
    normalizedTitle.includes("breakdown") ||
    normalizedTitle.includes("inside") ||
    normalizedTitle.includes("analysis")
  ) {
    return "Breakdown";
  }

  if (
    normalizedTitle.includes("how ") ||
    normalizedTitle.includes("why ") ||
    normalizedTitle.includes("guide") ||
    normalizedTitle.includes("explained")
  ) {
    return "Explainer";
  }

  return "Feature";
}

function calculateUploadCadenceDays(
  videos: Pick<VideoMetric, "publishedAt">[],
) {
  if (videos.length <= 1) {
    return 0;
  }

  const sorted = [...videos].sort((left, right) => {
    return (
      new Date(right.publishedAt).getTime() -
      new Date(left.publishedAt).getTime()
    );
  });

  const gaps: number[] = [];

  for (let index = 1; index < sorted.length; index += 1) {
    const newer = new Date(sorted[index - 1].publishedAt).getTime();
    const older = new Date(sorted[index].publishedAt).getTime();
    gaps.push((newer - older) / 86_400_000);
  }

  return round(average(gaps), 1);
}

function createTrendLabel(
  video: Pick<
    VideoMetric,
    "viewsPerDay" | "engagementRate" | "performanceScore"
  >,
  benchmarks: AnalysisBenchmarks,
): TrendLabel {
  const breakoutByVelocity =
    video.viewsPerDay >= benchmarks.medianViewsPerDay * 2.35;
  const breakoutByScore =
    video.performanceScore >= 220 &&
    video.viewsPerDay >= benchmarks.medianViewsPerDay * 1.6;

  if (breakoutByVelocity || breakoutByScore) {
    return "Breakout";
  }

  const surgingByVelocity =
    video.viewsPerDay >= benchmarks.medianViewsPerDay * 1.55;
  const surgingByScore =
    video.performanceScore >= 165 &&
    video.viewsPerDay >= benchmarks.medianViewsPerDay * 1.15;

  if (surgingByVelocity || surgingByScore) {
    return "Surging";
  }

  if (
    video.engagementRate >=
    Math.max(
      benchmarks.medianEngagementRate * 1.3,
      benchmarks.medianEngagementRate + 1.1,
    )
  ) {
    return "High Engagement";
  }

  return "Steady";
}

export function buildAnalysisPayload({
  channel,
  sourceMode,
  note,
  videos,
}: {
  channel: ChannelSummary;
  sourceMode: AnalysisSource;
  note?: string;
  videos: RawVideoInput[];
}): AnalysisPayload {
  const now = Date.now();

  const stagedVideos = videos.map<VideoMetric>((video) => {
    const publishedAtMs = new Date(video.publishedAt).getTime();
    const daysSincePublish = Math.max(1, (now - publishedAtMs) / 86_400_000);
    const viewsPerDay = video.viewCount / daysSincePublish;
    const engagementRate =
      video.viewCount > 0
        ? ((video.likeCount + video.commentCount) / video.viewCount) * 100
        : 0;

    return {
      id: video.id,
      title: video.title,
      description: video.description,
      tags: video.tags ?? [],
      categoryId: video.categoryId,
      categoryLabel: video.categoryLabel,
      topComments: video.topComments ?? [],
      thumbnailUrl: video.thumbnailUrl,
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      publishedAt: video.publishedAt,
      duration: compactDuration(video.durationSeconds),
      durationSeconds: video.durationSeconds,
      formatLabel: detectFormatLabel(video.title, video.durationSeconds),
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      commentCount: video.commentCount,
      daysSincePublish: round(daysSincePublish, 1),
      viewsPerDay: round(viewsPerDay, 1),
      engagementRate: round(engagementRate, 2),
      performanceScore: 0,
      trend: "Steady",
    };
  });

  const benchmarks: AnalysisBenchmarks = {
    medianViews: round(median(stagedVideos.map((video) => video.viewCount)), 0),
    medianViewsPerDay: round(
      median(stagedVideos.map((video) => video.viewsPerDay)),
      1,
    ),
    medianEngagementRate: round(
      median(stagedVideos.map((video) => video.engagementRate)),
      2,
    ),
    uploadCadenceDays: calculateUploadCadenceDays(stagedVideos),
  };

  const scoredVideos = stagedVideos.map<VideoMetric>((video) => {
    const recencyBoost = Math.max(0.45, 1.45 - video.daysSincePublish / 90);
    const velocityRatio =
      video.viewsPerDay / Math.max(benchmarks.medianViewsPerDay, 1);
    const engagementRatio =
      video.engagementRate / Math.max(benchmarks.medianEngagementRate, 0.75);
    const scaleRatio = video.viewCount / Math.max(benchmarks.medianViews, 1);
    const performanceScore = round(
      velocityRatio * 55 +
        engagementRatio * 22 +
        scaleRatio * 13 +
        recencyBoost * 10,
      0,
    );

    return {
      ...video,
      performanceScore,
      trend: createTrendLabel(
        {
          viewsPerDay: video.viewsPerDay,
          engagementRate: video.engagementRate,
          performanceScore,
        },
        benchmarks,
      ),
    };
  });

  const rankedVideos = [...scoredVideos].sort((left, right) => {
    if (right.performanceScore === left.performanceScore) {
      return right.viewCount - left.viewCount;
    }

    return right.performanceScore - left.performanceScore;
  });

  return {
    sourceMode,
    generatedAt: new Date().toISOString(),
    note,
    channel: {
      ...channel,
      uploadsAnalyzed: rankedVideos.length,
    },
    videos: rankedVideos,
    benchmarks,
  };
}
