import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack requires native binaries that may not be available on all
  // platforms. Webpack is the stable fallback.
  experimental: {},
};

export default nextConfig;
