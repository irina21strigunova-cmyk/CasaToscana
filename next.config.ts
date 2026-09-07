import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include official T-Bank/Gosuslugi CA bundle in every serverless function
  // so NODE_EXTRA_CA_CERTS can read it on Vercel (/var/task/...).
  outputFileTracingIncludes: {
    "/*": ["./certs/russian-trusted-ca-bundle.pem"],
    "/api/payments/create": ["./certs/russian-trusted-ca-bundle.pem"],
    "/api/payments/status": ["./certs/russian-trusted-ca-bundle.pem"],
    "/api/payments/notification": ["./certs/russian-trusted-ca-bundle.pem"],
  },
  webpack: (config, { dev }) => {
    // Avoid corrupted pack.gz cache on Windows when .next is cleared mid-session.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
