import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

const STRIP_FORWARD_HEADERS = new Set([
  "origin",
  "referer",
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
  "sec-fetch-user",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
]);

function normalizeBackendBase(value: string | undefined): string {
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

function resolveBackendBase(): string {
  return normalizeBackendBase(
    process.env.API_PROXY_TARGET ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL
  );
}

function buildTargetUrl(req: NextRequest, path: string[]): string {
  const backend = resolveBackendBase();
  const upstreamPath = path.join("/");
  const search = req.nextUrl.search || "";
  return `${backend}/api/${upstreamPath}${search}`;
}

function buildForwardHeaders(req: NextRequest): Headers {
  const headers = new Headers(req.headers);
  for (const key of HOP_BY_HOP_HEADERS) {
    headers.delete(key);
  }
  for (const key of STRIP_FORWARD_HEADERS) {
    headers.delete(key);
  }
  return headers;
}

async function proxyRequest(req: NextRequest, path: string[]) {
  const backend = resolveBackendBase();
  if (!backend) {
    return NextResponse.json(
      {
        error:
          "API backend is not configured. Set API_PROXY_TARGET (or NEXT_PUBLIC_BACKEND_URL) in Vercel.",
      },
      { status: 503 }
    );
  }

  const target = buildTargetUrl(req, path);
  const method = req.method.toUpperCase();
  const headers = buildForwardHeaders(req);

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const upstreamRes = await fetch(target, init);
  const responseHeaders = new Headers(upstreamRes.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
}

async function handler(req: NextRequest, context: { params: { path: string[] } }) {
  try {
    return await proxyRequest(req, context.params.path || []);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to reach API backend",
        detail: error instanceof Error ? error.message : "Unknown proxy error",
      },
      { status: 502 }
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS, handler as HEAD };
