import type { Metadata } from "next";
import { VidMetricsLandingPage } from "@/components/vidmetrics/landing-page";

export const metadata: Metadata = {
  title: "VidMetrics",
  description:
    "Paste any YouTube channel or video URL to see top videos, breakout trends, winning patterns, and cleaner competitor insights.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "YouTube Competitor Analysis | VidMetrics",
    description:
      "Paste any YouTube channel or video URL to see top videos, breakout trends, winning patterns, and cleaner competitor insights.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YouTube Competitor Analysis | VidMetrics",
    description:
      "Paste any YouTube channel or video URL to see top videos, breakout trends, winning patterns, and cleaner competitor insights.",
  },
};

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "VidMetrics",
    url: "https://vidmetrics.app/",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "A web app for analyzing YouTube competitor channels, top-performing videos, breakout trends, and content patterns.",
    featureList: [
      "Channel URL analysis",
      "Top video rankings",
      "Trend indicators",
      "Winning pattern insights",
      "Responsive dashboard",
      "CSV export",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VidMetricsLandingPage />
    </>
  );
}
