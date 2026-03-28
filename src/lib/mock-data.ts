import { subDays } from "date-fns";

import { buildAnalysisPayload } from "@/lib/analysis";
import type {
  AnalysisPayload,
  ChannelSummary,
  DemoChannelOption,
  RawVideoInput,
} from "@/lib/types";
import type { ParsedChannelInput } from "@/lib/youtube";

const demoModeNote =
  "No YouTube API key is configured, so VidMetrics is using a polished demo dataset. Add YOUTUBE_API_KEY to switch the dashboard to live channel analysis.";
const defaultUploadsLimit = 25;
const maxUploadsLimit = 100;
const allUploadsValue = 0;
type FormatScope = "all" | "shorts" | "videos";

function sanitizeUploadsLimit(value?: number) {
  if (value === allUploadsValue) {
    return allUploadsValue;
  }

  if (value == null || Number.isNaN(value)) {
    return defaultUploadsLimit;
  }

  return Math.min(Math.max(Math.round(value), 1), maxUploadsLimit);
}

function matchesFormatScope(durationSeconds: number, formatScope: FormatScope) {
  if (formatScope === "all") {
    return true;
  }

  if (formatScope === "shorts") {
    return durationSeconds <= 75;
  }

  return durationSeconds > 75;
}

function toDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createAvatar(name: string, accent: string) {
  const initials = name
    .split(" ")
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  return toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="32" fill="${accent}" />
      <circle cx="92" cy="24" r="14" fill="rgba(255,255,255,0.16)" />
      <text x="50%" y="56%" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="white">${initials}</text>
    </svg>
  `);
}

function createThumbnail(title: string, accent: string) {
  return toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#060709" />
        </linearGradient>
      </defs>
      <rect width="960" height="540" rx="44" fill="url(#hero)" />
      <circle cx="112" cy="96" r="56" fill="rgba(255,255,255,0.10)" />
      <circle cx="844" cy="420" r="104" fill="rgba(255,255,255,0.08)" />
      <text x="64" y="220" font-family="Arial, sans-serif" font-size="58" font-weight="700" fill="white">${title}</text>
      <text x="64" y="286" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.80)">VidMetrics demo dataset</text>
    </svg>
  `);
}

function daysAgo(days: number) {
  const publishedAt = subDays(new Date(), days);
  publishedAt.setHours(14, 0, 0, 0);
  return publishedAt.toISOString();
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferDemoCategory(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("news") || normalized.includes("update")) {
    return "News & Politics";
  }

  if (normalized.includes("interview") || normalized.includes("podcast")) {
    return "People & Blogs";
  }

  if (
    normalized.includes("how") ||
    normalized.includes("why") ||
    normalized.includes("breakdown") ||
    normalized.includes("explainer") ||
    normalized.includes("analysis")
  ) {
    return "Education";
  }

  return "Entertainment";
}

function createDemoComments(title: string) {
  const topic = title
    .replace(/^short:\s*/i, "")
    .replace(/^breakdown:\s*/i, "")
    .split(" ")
    .slice(0, 4)
    .join(" ");

  return [
    `This is one of the clearest takes on ${topic.toLowerCase()} I've seen.`,
    `The pacing, title, and thumbnail on this video really worked for me.`,
    `Would love a follow-up on the same topic with more examples and a deeper breakdown.`,
  ];
}

type DemoSeed = {
  accent: string;
  matchTerms: string[];
  channel: ChannelSummary;
  videos: RawVideoInput[];
};

const creatorPulseSeed: DemoSeed = {
  accent: "#6b7280",
  matchTerms: ["creatorpulse", "creator pulse"],
  channel: {
    id: "demo-creatorpulse",
    title: "CreatorPulse",
    handle: "@creatorpulse",
    description:
      "A creator economy channel covering channel strategy, content packaging, and format experimentation.",
    channelKeywords: [
      "creator strategy",
      "content packaging",
      "title testing",
      "thumbnail patterns",
    ],
    topicLabels: ["Creator Economy", "Media", "Publishing"],
    avatarUrl: createAvatar("CreatorPulse", "#6b7280"),
    subscriberCount: 486_000,
    totalViewCount: 82_400_000,
    videoCount: 412,
    uploadsAnalyzed: 0,
    channelUrl: "https://www.youtube.com/@creatorpulse",
  },
  videos: [
    {
      id: "creatorpulse-01",
      title: "Why recap clips are outpacing full episodes this month",
      description: "A breakdown of why clipped recap formats are winning.",
      thumbnailUrl: createThumbnail("Recap Clips Win", "#6b7280"),
      publishedAt: daysAgo(2),
      durationSeconds: 812,
      viewCount: 968_000,
      likeCount: 41_200,
      commentCount: 5_240,
    },
    {
      id: "creatorpulse-02",
      title: "Inside the title formulas driving 2x more clicks",
      description: "Packaging tactics from the latest creator uploads.",
      thumbnailUrl: createThumbnail("Title Formula", "#6b7280"),
      publishedAt: daysAgo(5),
      durationSeconds: 694,
      viewCount: 712_000,
      likeCount: 35_600,
      commentCount: 4_810,
    },
    {
      id: "creatorpulse-03",
      title: "Short: this thumbnail pattern keeps surfacing in March",
      description: "A fast short on current thumbnail patterns.",
      thumbnailUrl: createThumbnail("Thumbnail Pattern", "#6b7280"),
      publishedAt: daysAgo(7),
      durationSeconds: 48,
      viewCount: 456_000,
      likeCount: 24_900,
      commentCount: 1_160,
    },
    {
      id: "creatorpulse-04",
      title: "How media teams are building faster test loops",
      description: "A strategy explainer for editorial test loops.",
      thumbnailUrl: createThumbnail("Faster Test Loops", "#6b7280"),
      publishedAt: daysAgo(12),
      durationSeconds: 925,
      viewCount: 524_000,
      likeCount: 26_800,
      commentCount: 3_090,
    },
    {
      id: "creatorpulse-05",
      title: "This week in creator packaging: what changed",
      description: "News-style update on creator packaging patterns.",
      thumbnailUrl: createThumbnail("Packaging Update", "#6b7280"),
      publishedAt: daysAgo(19),
      durationSeconds: 504,
      viewCount: 318_000,
      likeCount: 14_900,
      commentCount: 1_640,
    },
    {
      id: "creatorpulse-06",
      title: "Why audience retention is climbing on shorter explainers",
      description: "Explainer about retention gains on shorter uploads.",
      thumbnailUrl: createThumbnail("Retention Climbs", "#6b7280"),
      publishedAt: daysAgo(24),
      durationSeconds: 643,
      viewCount: 602_000,
      likeCount: 28_300,
      commentCount: 3_450,
    },
    {
      id: "creatorpulse-07",
      title: "Interview: the editorial workflow behind a breakout channel",
      description: "Conversation on editorial workflow and channel systems.",
      thumbnailUrl: createThumbnail("Breakout Workflow", "#6b7280"),
      publishedAt: daysAgo(31),
      durationSeconds: 1_622,
      viewCount: 278_000,
      likeCount: 11_700,
      commentCount: 1_520,
    },
    {
      id: "creatorpulse-08",
      title: "Short: the best intro hook we saw all week",
      description: "Fast breakdown of a high-performing video intro hook.",
      thumbnailUrl: createThumbnail("Best Intro Hook", "#6b7280"),
      publishedAt: daysAgo(38),
      durationSeconds: 39,
      viewCount: 389_000,
      likeCount: 19_200,
      commentCount: 870,
    },
    {
      id: "creatorpulse-09",
      title: "Breakdown: why creator newsletters are feeding YouTube growth",
      description: "Analysis of newsletter-driven YouTube growth loops.",
      thumbnailUrl: createThumbnail("Newsletter Loop", "#6b7280"),
      publishedAt: daysAgo(46),
      durationSeconds: 1_048,
      viewCount: 244_000,
      likeCount: 10_600,
      commentCount: 1_110,
    },
    {
      id: "creatorpulse-10",
      title: "How format series create better watchtime compounding",
      description: "Explainer on watchtime compounding from series formats.",
      thumbnailUrl: createThumbnail("Series Compounding", "#6b7280"),
      publishedAt: daysAgo(58),
      durationSeconds: 882,
      viewCount: 198_000,
      likeCount: 8_900,
      commentCount: 980,
    },
  ],
};

const storyGridSeed: DemoSeed = {
  accent: "#4b5563",
  matchTerms: ["storygrid", "story grid", "studio"],
  channel: {
    id: "demo-storygrid",
    title: "StoryGrid Studio",
    handle: "@storygridstudio",
    description:
      "A documentary-style media brand producing narrative explainers, creative breakdowns, and short editorial hits.",
    channelKeywords: [
      "documentary",
      "editorial strategy",
      "storytelling",
      "publishing",
    ],
    topicLabels: ["Documentary", "Media", "Journalism"],
    avatarUrl: createAvatar("StoryGrid Studio", "#4b5563"),
    subscriberCount: 1_120_000,
    totalViewCount: 214_600_000,
    videoCount: 238,
    uploadsAnalyzed: 0,
    channelUrl: "https://www.youtube.com/@storygridstudio",
  },
  videos: [
    {
      id: "storygrid-01",
      title: "Inside the media company that rebuilt its YouTube strategy",
      description: "Feature documentary about a media brand turnaround.",
      thumbnailUrl: createThumbnail("Media Turnaround", "#4b5563"),
      publishedAt: daysAgo(3),
      durationSeconds: 1_144,
      viewCount: 1_480_000,
      likeCount: 63_400,
      commentCount: 7_850,
    },
    {
      id: "storygrid-02",
      title: "Breakdown: the thumbnail system behind a breakout doc channel",
      description: "Breakdown of a thumbnail system in documentary content.",
      thumbnailUrl: createThumbnail("Thumbnail System", "#4b5563"),
      publishedAt: daysAgo(10),
      durationSeconds: 812,
      viewCount: 816_000,
      likeCount: 37_700,
      commentCount: 4_440,
    },
    {
      id: "storygrid-03",
      title: "Why mini-documentaries are winning mobile attention",
      description: "Explainer on mini-doc storytelling for mobile.",
      thumbnailUrl: createThumbnail("Mini Docs Win", "#4b5563"),
      publishedAt: daysAgo(14),
      durationSeconds: 906,
      viewCount: 902_000,
      likeCount: 39_800,
      commentCount: 4_190,
    },
    {
      id: "storygrid-04",
      title: "Short: the cold open that made this story take off",
      description: "Quick look at a standout narrative cold open.",
      thumbnailUrl: createThumbnail("Cold Open", "#4b5563"),
      publishedAt: daysAgo(17),
      durationSeconds: 43,
      viewCount: 531_000,
      likeCount: 26_400,
      commentCount: 1_210,
    },
    {
      id: "storygrid-05",
      title: "News update: what premium publishers changed on YouTube",
      description: "News roundup focused on premium publisher strategy.",
      thumbnailUrl: createThumbnail("Publisher Update", "#4b5563"),
      publishedAt: daysAgo(26),
      durationSeconds: 488,
      viewCount: 412_000,
      likeCount: 18_700,
      commentCount: 1_950,
    },
    {
      id: "storygrid-06",
      title: "How great narration changes the pace of a feature",
      description: "Explainer on narration pacing in longer videos.",
      thumbnailUrl: createThumbnail("Narration Pace", "#4b5563"),
      publishedAt: daysAgo(34),
      durationSeconds: 1_034,
      viewCount: 598_000,
      likeCount: 24_300,
      commentCount: 2_610,
    },
    {
      id: "storygrid-07",
      title: "Interview: building a weekly franchise inside a newsroom",
      description:
        "Conversation about franchise building inside editorial teams.",
      thumbnailUrl: createThumbnail("Weekly Franchise", "#4b5563"),
      publishedAt: daysAgo(42),
      durationSeconds: 1_411,
      viewCount: 348_000,
      likeCount: 15_200,
      commentCount: 1_780,
    },
    {
      id: "storygrid-08",
      title: "Inside the editorial sprint behind a 10/10 upload",
      description: "Breakdown of an editorial production sprint.",
      thumbnailUrl: createThumbnail("Editorial Sprint", "#4b5563"),
      publishedAt: daysAgo(57),
      durationSeconds: 724,
      viewCount: 287_000,
      likeCount: 12_100,
      commentCount: 1_160,
    },
    {
      id: "storygrid-09",
      title: "Why these feature intros keep outperforming channel averages",
      description: "Explainer about outperforming feature intros.",
      thumbnailUrl: createThumbnail("Feature Intros", "#4b5563"),
      publishedAt: daysAgo(69),
      durationSeconds: 854,
      viewCount: 261_000,
      likeCount: 11_400,
      commentCount: 1_030,
    },
  ],
};

const growthCraftSeed: DemoSeed = {
  accent: "#94a3b8",
  matchTerms: ["growthcraft", "growth craft", "strategy"],
  channel: {
    id: "demo-growthcraft",
    title: "GrowthCraft Media",
    handle: "@growthcraftmedia",
    description:
      "A B2B-style strategy channel for agencies and creator teams focused on growth systems, reporting, and content ops.",
    channelKeywords: [
      "content ops",
      "reporting",
      "media teams",
      "growth systems",
    ],
    topicLabels: ["Business", "Marketing", "Media"],
    avatarUrl: createAvatar("GrowthCraft Media", "#94a3b8"),
    subscriberCount: 268_000,
    totalViewCount: 34_100_000,
    videoCount: 187,
    uploadsAnalyzed: 0,
    channelUrl: "https://www.youtube.com/@growthcraftmedia",
  },
  videos: [
    {
      id: "growthcraft-01",
      title: "How agencies are packaging monthly report wins for clients",
      description:
        "Explainer on reporting and narrative packaging for client teams.",
      thumbnailUrl: createThumbnail("Client Reporting", "#94a3b8"),
      publishedAt: daysAgo(4),
      durationSeconds: 752,
      viewCount: 384_000,
      likeCount: 18_600,
      commentCount: 2_740,
    },
    {
      id: "growthcraft-02",
      title: "Breakdown: a repeatable content ops dashboard for media teams",
      description: "Breakdown of an ops dashboard workflow.",
      thumbnailUrl: createThumbnail("Ops Dashboard", "#94a3b8"),
      publishedAt: daysAgo(9),
      durationSeconds: 946,
      viewCount: 441_000,
      likeCount: 20_100,
      commentCount: 2_840,
    },
    {
      id: "growthcraft-03",
      title: "Short: the KPI most teams are still missing",
      description: "Short-form clip on overlooked content KPIs.",
      thumbnailUrl: createThumbnail("Missing KPI", "#94a3b8"),
      publishedAt: daysAgo(13),
      durationSeconds: 44,
      viewCount: 292_000,
      likeCount: 16_400,
      commentCount: 720,
    },
    {
      id: "growthcraft-04",
      title: "Why view velocity beats raw views in weekly planning",
      description: "Explainer on using view velocity in planning rituals.",
      thumbnailUrl: createThumbnail("View Velocity", "#94a3b8"),
      publishedAt: daysAgo(18),
      durationSeconds: 678,
      viewCount: 356_000,
      likeCount: 17_200,
      commentCount: 2_110,
    },
    {
      id: "growthcraft-05",
      title: "News update: what changed in creator reporting this quarter",
      description: "News-style reporting recap for creator teams.",
      thumbnailUrl: createThumbnail("Reporting Update", "#94a3b8"),
      publishedAt: daysAgo(23),
      durationSeconds: 423,
      viewCount: 168_000,
      likeCount: 7_900,
      commentCount: 910,
    },
    {
      id: "growthcraft-06",
      title: "How to spot a breakout before the dashboard catches up",
      description: "Explainer on leading indicators for breakout content.",
      thumbnailUrl: createThumbnail("Spot A Breakout", "#94a3b8"),
      publishedAt: daysAgo(33),
      durationSeconds: 831,
      viewCount: 284_000,
      likeCount: 13_600,
      commentCount: 1_620,
    },
    {
      id: "growthcraft-07",
      title: "Interview: building reporting rituals that clients actually use",
      description: "Interview on reporting rituals and client communication.",
      thumbnailUrl: createThumbnail("Reporting Rituals", "#94a3b8"),
      publishedAt: daysAgo(41),
      durationSeconds: 1_303,
      viewCount: 142_000,
      likeCount: 6_100,
      commentCount: 810,
    },
    {
      id: "growthcraft-08",
      title: "Inside the competitive analysis workflow for YouTube teams",
      description: "A workflow breakdown for YouTube competitive analysis.",
      thumbnailUrl: createThumbnail("Competitive Workflow", "#94a3b8"),
      publishedAt: daysAgo(53),
      durationSeconds: 878,
      viewCount: 198_000,
      likeCount: 8_500,
      commentCount: 1_040,
    },
    {
      id: "growthcraft-09",
      title: "How format libraries reduce creative guesswork",
      description: "Explainer on format libraries and editorial systems.",
      thumbnailUrl: createThumbnail("Format Libraries", "#94a3b8"),
      publishedAt: daysAgo(74),
      durationSeconds: 712,
      viewCount: 126_000,
      likeCount: 5_400,
      commentCount: 620,
    },
  ],
};

const demoSeeds = [creatorPulseSeed, storyGridSeed, growthCraftSeed];

export const demoChannelOptions: DemoChannelOption[] = demoSeeds.map(
  (seed) => ({
    id: seed.channel.id,
    title: seed.channel.title,
    url: seed.channel.channelUrl,
    blurb: seed.channel.description,
  }),
);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function resolveDemoSeed(parsed: ParsedChannelInput) {
  const haystack = `${parsed.value} ${parsed.normalizedUrl}`.toLowerCase();

  return (
    demoSeeds.find((seed) =>
      seed.matchTerms.some((term) => haystack.includes(term.toLowerCase())),
    ) ?? creatorPulseSeed
  );
}

function createCustomDemoChannel(
  parsed: ParsedChannelInput,
  seed: DemoSeed,
): ChannelSummary {
  const label =
    parsed.kind === "channelId" ? "Channel Snapshot" : titleCase(parsed.value);
  const handle =
    parsed.kind === "channelId"
      ? "@channel-snapshot"
      : `@${slugify(parsed.value).replace(/-/g, "") || "vidmetricsdemo"}`;

  return {
    ...seed.channel,
    id: `demo-${slugify(parsed.value) || "channel"}`,
    title: label || seed.channel.title,
    handle,
    channelKeywords: seed.channel.channelKeywords,
    topicLabels: seed.channel.topicLabels,
    avatarUrl: createAvatar(label || seed.channel.title, seed.accent),
    channelUrl: parsed.normalizedUrl,
  };
}

export function buildDemoAnalysis(
  parsed: ParsedChannelInput,
  uploadsLimit = defaultUploadsLimit,
  formatScope: FormatScope = "all",
): AnalysisPayload {
  const seed = resolveDemoSeed(parsed);
  const limit = sanitizeUploadsLimit(uploadsLimit);
  const isKnownDemoChannel = seed.matchTerms.some((term) =>
    `${parsed.value} ${parsed.normalizedUrl}`
      .toLowerCase()
      .includes(term.toLowerCase()),
  );
  const channel = isKnownDemoChannel
    ? seed.channel
    : createCustomDemoChannel(parsed, seed);

  return buildAnalysisPayload({
    channel,
    sourceMode: "demo",
    note: demoModeNote,
    videos: (limit === allUploadsValue ? seed.videos : seed.videos)
      .filter((video) => matchesFormatScope(video.durationSeconds, formatScope))
      .slice(0, limit === allUploadsValue ? undefined : limit)
      .map((video) => ({
        ...video,
        categoryLabel: video.categoryLabel ?? inferDemoCategory(video.title),
        topComments: video.topComments ?? createDemoComments(video.title),
      })),
  });
}
