import type { MetadataRoute } from "next";

const BASE_URL = process.env["NEXT_PUBLIC_WEB_URL"] ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/for-you", "/saved", "/settings", "/profile"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
