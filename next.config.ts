import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep these packages as native Node.js requires — not bundled by Turbopack.
  // stripe: CJS module.exports pattern breaks under ESM interop bundling.
  // mysql2: native C++ bindings must stay external.
  serverExternalPackages: ["stripe", "mysql2"],
};

export default nextConfig;
