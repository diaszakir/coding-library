import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: process.env.DEVLIBRARY_STANDALONE === "true" ? "standalone" : undefined,
  images: { unoptimized: true },
  // The file-backed Store loads these seed files at runtime on a fresh install.
  outputFileTracingIncludes: {
    "/api/*": ["./data/catalog.json", "./courses.config.json", "./public/content/*.json"],
  },
};
export default nextConfig;
