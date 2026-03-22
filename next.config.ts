import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
