import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/analyze"],
      },
    ],
    sitemap: "https://vidmetrics.app/sitemap.xml",
    host: "https://vidmetrics.app",
  };
}
