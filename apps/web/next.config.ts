import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // MinIO / S3 dev
      { protocol: "http", hostname: "localhost", port: "9000" },
      // Production CDN — add your domain here
      // { protocol: "https", hostname: "cdn.your-domain.com" },
      // Allow all external hostnames for scraped article images
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // typedRoutes: true, // enable when routes are stable
  },
};

export default nextConfig;
