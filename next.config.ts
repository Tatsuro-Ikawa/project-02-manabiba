import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopackを無効化して安定性を向上
  experimental: {
    turbo: false,
  },
};

export default nextConfig;
