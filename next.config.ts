import type { NextConfig } from "next";
import kolonakiConfig from "./kolonaki.config";
import { validateKolonakiConfig } from "./lib/kolonaki/validate";

// Validates kolonaki.config.ts at build time — throws ZodError with actionable message if invalid.
validateKolonakiConfig(kolonakiConfig);

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/lrigu76hy/**",
      },
    ],
  },
};

export default nextConfig;
