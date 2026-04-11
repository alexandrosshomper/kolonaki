import type { NextConfig } from "next";
import kolonakiConfig from "./kolonaki.config";
import { validateKolonakiConfig } from "./lib/kolonaki/validate";

// Validates kolonaki.config.ts at build time — throws ZodError with actionable message if invalid.
validateKolonakiConfig(kolonakiConfig);

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
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
