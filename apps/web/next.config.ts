import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@hollywood/types",
    "@hollywood/db",
    "@hollywood/queue",
    "@hollywood/storage",
    "@hollywood/trpc",
  ],
  serverExternalPackages: ["postgres", "ioredis", "bullmq"],
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
