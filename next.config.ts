import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product images can be uploaded (served from /api/media or the S3/R2
    // bucket) or pasted as a URL by an admin, so allow any https host.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Prevent secrets leaking to client bundle
  serverExternalPackages: ["bcryptjs", "@prisma/client", "prisma", "sharp"],
};

export default nextConfig;
