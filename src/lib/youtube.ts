import { buildAnalysisPayload } from "@/lib/analysis";
import type {
  AnalysisPayload,
  ChannelSummary,
  RawVideoInput,
} from "@/lib/types";

type ParsedChannelKind =
  | "handle"
  | "channelId"
  | "username"
  | "search"
  | "videoId";
type FormatScope = "all" | "shorts" | "videos";

export interface ParsedChannelInput {
  kind: ParsedChannelKind;
  value: string;
  normalizedUrl: string;
}

type YouTubeListResponse<T> = {
  items: T[];
  nextPageToken?: string;
};

type ThumbnailMap = {
  default?: { url: string };
  medium?: { url: string };
  high?: { url: string };
  standard?: { url: string };
  maxres?: { url: string };
};

type ChannelItem = {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    thumbnails: ThumbnailMap;
  };
  statistics: {
    subscriberCount?: string;
    videoCount?: string;
    viewCount?: string;
  };
  contentDetails: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
  brandingSettings?: {
    channel?: {
      keywords?: string;
    };
  };
  topicDetails?: {
    topicCategories?: string[];
  };
};

type SearchItem = {
  snippet: {
    channelId: string;
  };
};

type VideoLookupItem = {
  id: string;
  snippet: {
    channelId: string;
  };
};

type PlaylistItem = {
  contentDetails?: {
    videoId?: string;
  };
};

type VideoItem = {
  id: string;
  snippet: {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    publishedAt: string;
    liveBroadcastContent?: string;
    thumbnails: ThumbnailMap;
  };
  contentDetails: {
    duration: string;
  };
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

type VideoCategoryItem = {
  id: string;
  snippet: {
    title: string;
  };
};

type CommentThreadItem = {
  snippet?: {
    topLevelComment?: {
      snippet?: {
        textDisplay?: string;
        textOriginal?: string;
      };
    };
  };
};

const defaultUploadsLimit = 25;
const maxUploadsLimit = 100;
const allUploadsValue = 0;

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

export function normalizeYouTubeChannelInput(
  input: string,
): ParsedChannelInput {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Paste a YouTube channel or video URL to analyze.");
  }

  let candidate = trimmed;

  if (trimmed.startsWith("@")) {
    candidate = `https://www.youtube.com/${trimmed}`;
  } else if (
    !/^https?:\/\//i.test(trimmed) &&
    (trimmed.startsWith("youtube.com/") ||
      trimmed.startsWith("www.youtube.com/") ||
      trimmed.startsWith("m.youtube.com/") ||
      trimmed.startsWith("youtu.be/"))
  ) {
    candidate = `https://${trimmed}`;
  }

  if (!/^https?:\/\//i.test(candidate)) {
    throw new Error(
      "Use a YouTube channel or video URL such as youtube.com/@channel, /channel/..., /user/..., /watch?v=..., or youtu.be/....",
    );
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid YouTube channel or video URL.");
  }

  if (
    !/(^|\.)youtube\.com$/.test(url.hostname) &&
    url.hostname !== "youtu.be"
  ) {
    throw new Error(
      "Only YouTube channel or video URLs are supported for this MVP.",
    );
  }

  if (url.hostname === "youtu.be") {
    const videoId = url.pathname.split("/").filter(Boolean)[0];

    if (!videoId) {
      throw new Error("Paste a specific YouTube video or channel URL.");
    }

    return {
      kind: "videoId",
      value: videoId,
      normalizedUrl: `https://youtu.be/${videoId}`,
    };
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (url.pathname === "/watch") {
    const videoId = url.searchParams.get("v");

    if (!videoId) {
      throw new Error("Paste a specific YouTube video or channel URL.");
    }

    return {
      kind: "videoId",
      value: videoId,
      normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  if (!segments.length) {
    throw new Error(
      "Paste a specific YouTube video or channel URL instead of the YouTube homepage.",
    );
  }

  const [firstSegment, secondSegment] = segments;

  if ((firstSegment === "shorts" || firstSegment === "live") && secondSegment) {
    return {
      kind: "videoId",
      value: secondSegment,
      normalizedUrl: `https://www.youtube.com/${firstSegment}/${secondSegment}`,
    };
  }

  if (firstSegment.startsWith("@")) {
    return {
      kind: "handle",
      value: firstSegment.replace(/^@/, ""),
      normalizedUrl: `https://www.youtube.com/${firstSegment}`,
    };
  }

  if (firstSegment === "channel" && secondSegment) {
    return {
      kind: "channelId",
      value: secondSegment,
      normalizedUrl: `https://www.youtube.com/channel/${secondSegment}`,
    };
  }

  if (firstSegment === "user" && secondSegment) {
    return {
      kind: "username",
      value: secondSegment,
      normalizedUrl: `https://www.youtube.com/user/${secondSegment}`,
    };
  }

  if (firstSegment === "c" && secondSegment) {
    return {
      kind: "search",
      value: secondSegment,
      normalizedUrl: `https://www.youtube.com/c/${secondSegment}`,
    };
  }

  return {
    kind: "search",
    value: firstSegment,
    normalizedUrl: `https://www.youtube.com/${firstSegment}`,
  };
}

function pickThumbnail(thumbnails: ThumbnailMap) {
  return (
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    ""
  );
}

function parseCount(value?: string) {
  return Number(value ?? 0);
}

function parseIsoDuration(duration: string) {
  const match =
    /P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/.exec(
      duration,
    );

  if (!match) {
    return 0;
  }

  const [, hours = "0", minutes = "0", seconds = "0"] = match;

  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

async function youtubeFetch<T>(
  endpoint: string,
  params: Record<string, string>,
  apiKey: string,
) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `YouTube API request failed (${response.status}). ${errorBody || "Unknown error."}`,
    );
  }

  return (await response.json()) as T;
}

async function fetchChannelById(channelId: string, apiKey: string) {
  const response = await youtubeFetch<YouTubeListResponse<ChannelItem>>(
    "channels",
    {
      part: "snippet,statistics,contentDetails,brandingSettings,topicDetails",
      id: channelId,
    },
    apiKey,
  );

  return response.items[0];
}

function parseChannelKeywords(keywords?: string) {
  if (!keywords) {
    return [];
  }

  const matches = keywords.match(/"[^"]+"|\S+/g) ?? [];
  const seen = new Set<string>();

  return matches
    .map((value) => value.replace(/^"|"$/g, "").trim())
    .filter(Boolean)
    .filter((value) => {
      const normalized = value.toLowerCase();

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    })
    .slice(0, 12);
}

function parseTopicLabels(topicCategories?: string[]) {
  const seen = new Set<string>();

  return (topicCategories ?? [])
    .map((value) => {
      const tail = decodeURIComponent(value).split("/").filter(Boolean).pop();
      const cleaned = tail
        ? tail
            .replace(/_/g, " ")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase())
        : null;

      if (!cleaned) {
        return null;
      }

      const normalized = cleaned.toLowerCase();

      if (seen.has(normalized)) {
        return null;
      }

      seen.add(normalized);
      return cleaned;
    })
    .filter((value): value is string => Boolean(value))
    .slice(0, 8);
}

async function fetchVideoCategoryMap(apiKey: string) {
  const response = await youtubeFetch<YouTubeListResponse<VideoCategoryItem>>(
    "videoCategories",
    {
      part: "snippet",
      regionCode: "US",
    },
    apiKey,
  );

  return new Map(response.items.map((item) => [item.id, item.snippet.title]));
}

async function fetchTopComments(videoId: string, apiKey: string) {
  try {
    const response = await youtubeFetch<YouTubeListResponse<CommentThreadItem>>(
      "commentThreads",
      {
        part: "snippet",
        videoId,
        order: "relevance",
        maxResults: "5",
        textFormat: "plainText",
      },
      apiKey,
    );

    return response.items
      .map(
        (item) =>
          item.snippet?.topLevelComment?.snippet?.textDisplay?.trim() ||
          item.snippet?.topLevelComment?.snippet?.textOriginal?.trim(),
      )
      .filter((value): value is string => Boolean(value));
  } catch {
    return [];
  }
}

async function fetchVideoById(videoId: string, apiKey: string) {
  const response = await youtubeFetch<YouTubeListResponse<VideoLookupItem>>(
    "videos",
    {
      part: "snippet",
      id: videoId,
    },
    apiKey,
  );

  return response.items[0];
}

async function resolveChannel(parsed: ParsedChannelInput, apiKey: string) {
  if (parsed.kind === "channelId") {
    const channel = await fetchChannelById(parsed.value, apiKey);

    if (!channel) {
      throw new Error("No YouTube channel matched that channel ID.");
    }

    return channel;
  }

  if (parsed.kind === "handle") {
    const response = await youtubeFetch<YouTubeListResponse<ChannelItem>>(
      "channels",
      {
        part: "snippet,statistics,contentDetails,brandingSettings,topicDetails",
        forHandle: parsed.value,
      },
      apiKey,
    );

    if (!response.items.length) {
      throw new Error("No YouTube channel matched that handle.");
    }

    return response.items[0];
  }

  if (parsed.kind === "username") {
    const response = await youtubeFetch<YouTubeListResponse<ChannelItem>>(
      "channels",
      {
        part: "snippet,statistics,contentDetails,brandingSettings,topicDetails",
        forUsername: parsed.value,
      },
      apiKey,
    );

    if (!response.items.length) {
      throw new Error("No YouTube channel matched that username.");
    }

    return response.items[0];
  }

  if (parsed.kind === "videoId") {
    const video = await fetchVideoById(parsed.value, apiKey);

    if (!video?.snippet.channelId) {
      throw new Error("No YouTube channel matched that video URL.");
    }

    const channel = await fetchChannelById(video.snippet.channelId, apiKey);

    if (!channel) {
      throw new Error(
        "A matching YouTube channel was found from that video, but its details could not be loaded.",
      );
    }

    return channel;
  }

  const searchResponse = await youtubeFetch<YouTubeListResponse<SearchItem>>(
    "search",
    {
      part: "snippet",
      type: "channel",
      maxResults: "1",
      q: parsed.value,
    },
    apiKey,
  );

  const channelId = searchResponse.items[0]?.snippet.channelId;

  if (!channelId) {
    throw new Error("No YouTube channel matched that URL.");
  }

  const channel = await fetchChannelById(channelId, apiKey);

  if (!channel) {
    throw new Error(
      "A matching YouTube channel was found, but its details could not be loaded.",
    );
  }

  return channel;
}

async function fetchChannelVideos(
  uploadsPlaylistId: string,
  apiKey: string,
  uploadsLimit = defaultUploadsLimit,
  formatScope: FormatScope = "all",
): Promise<RawVideoInput[]> {
  const categoryMap = await fetchVideoCategoryMap(apiKey);
  const limit = sanitizeUploadsLimit(uploadsLimit);
  const targetCount = limit === allUploadsValue ? Infinity : limit;
  const collectedVideos: RawVideoInput[] = [];
  let nextPageToken: string | undefined;

  // Shorts-only and long-video-only boards often need to go deeper into the
  // upload history than the mixed recent list, so keep paging until the
  // requested scope has enough matches.
  while (collectedVideos.length < targetCount) {
    const playlistItemsResponse = await youtubeFetch<
      YouTubeListResponse<PlaylistItem>
    >(
      "playlistItems",
      {
        part: "contentDetails",
        maxResults: "50",
        playlistId: uploadsPlaylistId,
        ...(nextPageToken ? { pageToken: nextPageToken } : {}),
      },
      apiKey,
    );

    const videoIds = playlistItemsResponse.items
      .map((item) => item.contentDetails?.videoId)
      .filter((value): value is string => Boolean(value));

    if (videoIds.length) {
      const batchVideos: VideoItem[] = [];

      for (let index = 0; index < videoIds.length; index += 50) {
        const batch = videoIds.slice(index, index + 50);
        const videosResponse = await youtubeFetch<
          YouTubeListResponse<VideoItem>
        >(
          "videos",
          {
            part: "snippet,statistics,contentDetails",
            id: batch.join(","),
            maxResults: String(batch.length),
          },
          apiKey,
        );

        batchVideos.push(...videosResponse.items);
      }

      const matchingVideos = batchVideos
        .filter((video) => video.snippet.liveBroadcastContent !== "upcoming")
        .map((video) => ({
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          tags: video.snippet.tags ?? [],
          categoryId: video.snippet.categoryId,
          categoryLabel: video.snippet.categoryId
            ? categoryMap.get(video.snippet.categoryId)
            : undefined,
          thumbnailUrl: pickThumbnail(video.snippet.thumbnails),
          publishedAt: video.snippet.publishedAt,
          durationSeconds: parseIsoDuration(video.contentDetails.duration),
          viewCount: parseCount(video.statistics.viewCount),
          likeCount: parseCount(video.statistics.likeCount),
          commentCount: parseCount(video.statistics.commentCount),
        }))
        .filter((video) =>
          matchesFormatScope(video.durationSeconds, formatScope),
        )
        .sort((left, right) => {
          return (
            new Date(right.publishedAt).getTime() -
            new Date(left.publishedAt).getTime()
          );
        });

      const remaining =
        limit === allUploadsValue
          ? matchingVideos.length
          : targetCount - collectedVideos.length;
      collectedVideos.push(...matchingVideos.slice(0, remaining));
    }

    nextPageToken = playlistItemsResponse.nextPageToken;

    if (!nextPageToken || playlistItemsResponse.items.length === 0) {
      break;
    }
  }

  if (!collectedVideos.length) {
    throw new Error(
      "The channel does not have recent uploads available for analysis.",
    );
  }

  return collectedVideos.sort((left, right) => {
    return (
      new Date(right.publishedAt).getTime() -
      new Date(left.publishedAt).getTime()
    );
  });
}

export async function getYouTubeChannelAnalysis(
  input: string,
  apiKey: string,
  uploadsLimit = defaultUploadsLimit,
  formatScope: FormatScope = "all",
): Promise<AnalysisPayload> {
  const parsed = normalizeYouTubeChannelInput(input);
  const channel = await resolveChannel(parsed, apiKey);
  const uploadsPlaylistId = channel.contentDetails.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error("The channel uploads playlist could not be resolved.");
  }

  const videos = await fetchChannelVideos(
    uploadsPlaylistId,
    apiKey,
    uploadsLimit,
    formatScope,
  );
  const topCommentTargets = videos.slice(0, Math.min(videos.length, 25));
  const commentsByVideo = await Promise.all(
    topCommentTargets.map(async (video) => ({
      id: video.id,
      comments: await fetchTopComments(video.id, apiKey),
    })),
  );
  const commentMap = new Map(
    commentsByVideo.map((item) => [item.id, item.comments]),
  );
  const enrichedVideos = videos.map((video) => ({
    ...video,
    topComments: commentMap.get(video.id) ?? [],
  }));
  const customUrl = channel.snippet.customUrl
    ? `@${channel.snippet.customUrl.replace(/^@/, "")}`
    : parsed.kind === "handle"
      ? `@${parsed.value}`
      : `@${channel.snippet.title.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;

  const channelSummary: ChannelSummary = {
    id: channel.id,
    title: channel.snippet.title,
    handle: customUrl,
    description: channel.snippet.description,
    channelKeywords: parseChannelKeywords(
      channel.brandingSettings?.channel?.keywords,
    ),
    topicLabels: parseTopicLabels(channel.topicDetails?.topicCategories),
    avatarUrl: pickThumbnail(channel.snippet.thumbnails),
    subscriberCount: parseCount(channel.statistics.subscriberCount),
    totalViewCount: parseCount(channel.statistics.viewCount),
    videoCount: parseCount(channel.statistics.videoCount),
    uploadsAnalyzed: 0,
    channelUrl:
      channel.snippet.customUrl && channel.snippet.customUrl.length > 0
        ? `https://www.youtube.com/@${channel.snippet.customUrl.replace(/^@/, "")}`
        : `https://www.youtube.com/channel/${channel.id}`,
  };

  return buildAnalysisPayload({
    channel: channelSummary,
    sourceMode: "youtube",
    videos: enrichedVideos,
  });
}
