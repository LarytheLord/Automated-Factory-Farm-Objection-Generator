import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // NEXT_PUBLIC_* variables are automatically exposed by Next.js
  // No need for the env block - Next.js reads them from .env files automatically
  output: "export", // This ensures the app is built for static export
  trailingSlash: true, // Add trailing slashes to all routes
  images: {
    unoptimized: true // Required for static exports
  }
};

export default nextConfig;
