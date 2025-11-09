import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
  },
  output: "export", // This ensures the app is built for static export
  trailingSlash: true, // Add trailing slashes to all routes
  images: {
    unoptimized: true // Required for static exports
  }
};

export default nextConfig;
