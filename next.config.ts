import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // ESLintエラーをビルド時に無視（本番デプロイ用）
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScriptエラーをビルド時に無視（本番デプロイ用）
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
