import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@yiwallet/ui', '@yiwallet/auth'],
};

export default nextConfig;
