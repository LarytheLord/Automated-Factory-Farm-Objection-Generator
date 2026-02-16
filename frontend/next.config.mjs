/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore build errors for TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Output configuration for deployment
  output: 'standalone',
};

export default nextConfig;
