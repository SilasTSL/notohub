import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — serves pre-rendered HTML from S3/CloudFront
  output: "export",

  // Required for static export (no Next.js image optimisation server)
  images: {
    unoptimized: true,
  },

  // Trailing slash keeps S3 static hosting happy
  trailingSlash: true,

  // Expose public env vars to the browser bundle
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "",
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION ?? "ap-southeast-1",
  },
};

export default nextConfig;
