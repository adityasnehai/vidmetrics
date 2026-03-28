export type AnalysisSource = "demo" | "youtube";

export type TrendLabel = "Breakout" | "Surging" | "High Engagement" | "Steady";

export type RankingMode = "momentum" | "views" | "engagement";

export type SortKey =
  | "performanceScore"
  | "viewCount"
  | "viewsPerDay"
  | "engagementRate"
  | "publishedAt"
  | "likeCount"
  | "commentCount";

export interface ChannelSummary {
  id: string;
  title: string;
  handle: string;
  description: string;
  channelKeywords?: string[];
  topicLabels?: string[];
  avatarUrl: string;
  subscriberCount: number;
  totalViewCount: number;
  videoCount: number;
  uploadsAnalyzed: number;
  channelUrl: string;
}

export interface VideoMetric {
  id: string;
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  categoryLabel?: string;
  topComments?: string[];
  thumbnailUrl: string;
  videoUrl: string;
  publishedAt: string;
  duration: string;
  durationSeconds: number;
  formatLabel: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  daysSincePublish: number;
  viewsPerDay: number;
  engagementRate: number;
  performanceScore: number;
  trend: TrendLabel;
}

export interface AnalysisBenchmarks {
  medianViews: number;
  medianViewsPerDay: number;
  medianEngagementRate: number;
  uploadCadenceDays: number;
}

export interface AnalysisPayload {
  sourceMode: AnalysisSource;
  generatedAt: string;
  note?: string;
  channel: ChannelSummary;
  videos: VideoMetric[];
  benchmarks: AnalysisBenchmarks;
}

export interface DemoChannelOption {
  id: string;
  title: string;
  url: string;
  blurb: string;
}

export interface RawVideoInput {
  id: string;
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  categoryLabel?: string;
  topComments?: string[];
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}
