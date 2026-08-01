import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output bundles everything needed to run on a Linux server
  // without a full node_modules install.
  output: "standalone",

  // Keep these packages as native Node.js requires — not bundled by Turbopack.
  // stripe: CJS module.exports pattern breaks under ESM interop bundling.
  // mysql2: native C++ bindings must stay external.
  serverExternalPackages: ["stripe", "mysql2"],
};

export default nextConfig;
