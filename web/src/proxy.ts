import { NextRequest, NextResponse } from "next/server";

// In-memory limiter: fine for a single-server demo. Production would use Redis or the edge/CDN.
const hits = new Map<string, { n: number; reset: number }>();
const WINDOW_MS = 60_000;
const LIMIT = 60;

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Cross-site request blocking: a browser always sends Origin on cross-site writes.
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.headers.get("origin");
    if (origin) {
      let host = "";
      try {
        host = new URL(origin).host;
      } catch {}
      if (host !== req.headers.get("host")) {
        return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
      }
    }
  }

  // 2. Rate limit login and register. Per IP when one is known; otherwise per device type,
  //    so devices on the same Wi-Fi do not all share a single bucket.
  if (req.method === "POST" && pathname.startsWith("/api/auth/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim();
    const key = ip || "ua:" + (req.headers.get("user-agent") ?? "none");
    const now = Date.now();
    if (hits.size > 1000) hits.clear();
    const h = hits.get(key);
    if (!h || h.reset < now) {
      hits.set(key, { n: 1, reset: now + WINDOW_MS });
    } else if (++h.n > LIMIT) {
      const wait = Math.ceil((h.reset - now) / 1000);
      return NextResponse.json(
        { error: `Too many requests. Try again in ${wait}s.` },
        { status: 429, headers: { "Retry-After": String(wait) } }
      );
    }
  }

  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };