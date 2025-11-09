import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Environment variables
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  },
  // Handle static generation properly
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  output: "export", // This ensures the app is built for static export
};

export default nextConfig;
