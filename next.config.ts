import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // For containerization
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
  images: {
    domains: [
      'simpleicons.org',
      'selfh.st', 
      'raw.githubusercontent.com',
    ],
    unoptimized: true, 
  },
};

export default nextConfig;