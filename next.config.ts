import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export',
  images: {
    unoptimized: true,
  },
  experimental: {
    // any experimental flags that might help
  }
};

export default nextConfig;
