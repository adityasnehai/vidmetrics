import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vidmetrics.app"),
  applicationName: "VidMetrics",
  title: {
    default: "VidMetrics",
    template: "VidMetrics",
  },
  description:
    "Analyze any YouTube competitor channel, rank top videos, and turn public channel data into a clear competitor research dashboard.",
  keywords: [
    "YouTube competitor analysis",
    "YouTube analytics dashboard",
    "competitor video research",
    "creator intelligence",
    "media analytics SaaS",
    "channel performance tracker",
  ],
  authors: [{ name: "Aditya" }],
  creator: "Aditya",
  publisher: "VidMetrics",
  category: "technology",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon",
    shortcut: "/icon",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "VidMetrics",
    title: "VidMetrics",
    description:
      "Analyze any YouTube competitor channel, rank top videos, and review public channel performance in one clear dashboard.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VidMetrics",
    description:
      "Analyze any YouTube competitor channel, rank top videos, and review public channel performance in one clear dashboard.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f5fc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="bg-background text-foreground flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
