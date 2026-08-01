import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Standalone output bundles everything needed to run on a Linux server
  // without a full node_modules install.
  output: "standalone",

  // Keep these packages as native Node.js requires — not bundled by Turbopack.
  // stripe: CJS module.exports pattern breaks under ESM interop bundling.
  // mysql2: native C++ bindings must stay external.
  serverExternalPackages: ["stripe", "mysql2"],

  // Explicitly pin the Turbopack root to this package directory.
  // This silences the "multiple lockfiles" warning when the repo has a
  // parent-level package-lock.json alongside this one.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
