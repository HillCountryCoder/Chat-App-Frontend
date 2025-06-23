import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dqg4kc5tr7ivl.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
