import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: process.env.S3_PUBLIC_URL
          ? new URL(process.env.S3_PUBLIC_URL).hostname
          : "files.shubashco.com",
      },
    ],
  },
  // Prevent secrets leaking to client bundle
  serverExternalPackages: ["bcryptjs", "@prisma/client", "prisma"],
};

export default nextConfig;
