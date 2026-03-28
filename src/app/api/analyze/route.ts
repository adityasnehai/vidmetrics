import { NextResponse } from "next/server";
import { z } from "zod";

import { buildDemoAnalysis } from "@/lib/mock-data";
import {
  getYouTubeChannelAnalysis,
  normalizeYouTubeChannelInput,
} from "@/lib/youtube";

const bodySchema = z.object({
  channelUrl: z.string().min(3),
  uploadsLimit: z.number().int().min(0).max(100).default(25),
  formatScope: z.enum(["all", "shorts", "videos"]).default("all"),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
    const parsed = normalizeYouTubeChannelInput(payload.channelUrl);
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        buildDemoAnalysis(parsed, payload.uploadsLimit, payload.formatScope),
      );
    }

    const analysis = await getYouTubeChannelAnalysis(
      parsed.normalizedUrl,
      apiKey,
      payload.uploadsLimit,
      payload.formatScope,
    );
    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Enter a valid YouTube channel or video URL." },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to analyze that channel right now.";
    const status = /supported|valid|match|resolved|specific/i.test(message)
      ? 400
      : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
