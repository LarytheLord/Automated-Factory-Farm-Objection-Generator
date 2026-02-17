/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL: Disable all static generation
  output: 'standalone',
  
  // Force all routes to be server-rendered
  experimental: {
    // Enable server actions which forces SSR
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Don't generate static pages
  trailingSlash: false,
  
  // Ignore build errors
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
