import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the demo-session cookie and SQLite, so they are dynamic.
  cacheComponents: false,
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
