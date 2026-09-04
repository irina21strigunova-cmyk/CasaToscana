import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    // Avoid corrupted pack.gz cache on Windows when .next is cleared mid-session.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
