function normalizeApiProxyTarget(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    let pathname = (parsed.pathname || "").replace(/\/+$/g, "");
    if (pathname.toLowerCase() === "/api") {
      pathname = "";
    }
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch {
    return raw.replace(/\/+$/g, "").replace(/\/api$/i, "");
  }
}

/** @type {import('next').NextConfig} */
const apiProxyTarget = normalizeApiProxyTarget(
  process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    ""
);

const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async rewrites() {
    if (!apiProxyTarget) return [];
    const base = apiProxyTarget.replace(/\/+$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${base}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
