import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: false, // strict mode renders components twice in dev, doubling work
};

export default nextConfig;
