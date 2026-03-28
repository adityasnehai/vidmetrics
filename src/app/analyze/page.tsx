import type { Metadata } from "next";
import { VidMetricsApp } from "@/components/vidmetrics/vidmetrics-app";

export const metadata: Metadata = {
  title: "VidMetrics",
  description:
    "Load a YouTube channel or video URL to review top videos, content patterns, and competitor performance.",
  alternates: {
    canonical: "/analyze",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const params = await searchParams;

  return <VidMetricsApp initialChannelUrl={params.channel} />;
}
