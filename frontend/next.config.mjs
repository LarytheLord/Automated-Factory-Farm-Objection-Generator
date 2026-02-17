/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Ensure API routes work in standalone mode
  standalone: true,
};

export default nextConfig;
