import { auth } from "@/lib/auth";
import { Aggregator } from "@/lib/services/aggregator";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { NextResponse, type NextRequest } from "next/server";
import { getWrapYear, isValidWrapYear } from "@/lib/wrapYear";
import { createRequestLogger } from "@/lib/logger";
import { reportError } from "@/lib/errorMonitoring";

// Quota on *generation* (the expensive path: per-provider upstream API
// calls), not on serving an already-cached wrap. Ten generations/hour is
// enough for legitimate reconnect/retry use and low enough to blunt a script
// hammering the refresh button or an attacker driving up upstream API usage.
const GENERATE_LIMIT = 10;
const GENERATE_WINDOW_MS = 60 * 60 * 1000;

// A cached wrap younger than this is served without touching provider APIs.
// Older wraps are still served (fast, cheap) but flagged stale so the client
// can offer a force refresh — stale-while-revalidate, without blocking a
// serverless request on a multi-provider regeneration.
const WRAP_CACHE_TTL_MS = 30 * 60 * 1000;

function tooManyRequests(resetAt: number) {
  return NextResponse.json(
    { error: "Too many wrap refreshes. Try again later." },
    { status: 429, headers: { "Retry-After": Math.ceil((resetAt - Date.now()) / 1000).toString() } },
  );
}

function parseYear(request: NextRequest): number {
  const raw = request.nextUrl.searchParams.get("year");
  if (raw) {
    const n = Number(raw);
    if (isValidWrapYear(n)) return n;
  }
  return getWrapYear();
}

function wrapHeaders(cache: "hit" | "stale" | "miss" | "refresh", generatedAt: string) {
  const headers = new Headers();
  headers.set("X-Wrap-Cache", cache);
  headers.set("X-Wrap-Generated-At", generatedAt);
  if (cache === "stale") headers.set("X-Wrap-Stale", "true");
  return headers;
}

export async function GET(request: NextRequest) {
  const log = createRequestLogger("api/wrap GET");
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const year = parseYear(request);

  try {
    // 1. Serve a cached wrap when one exists — single index lookup
    //    (@@unique([userId, year])), no sort, only `data` + `createdAt`.
    const existingWrap = await prisma.wrap.findUnique({
      where: { userId_year: { userId, year } },
      select: { data: true, createdAt: true },
    });

    if (existingWrap) {
      const stale = Date.now() - existingWrap.createdAt.getTime() > WRAP_CACHE_TTL_MS;
      log.info("wrap served from cache", { userId, year, stale });
      return NextResponse.json(existingWrap.data, {
        headers: wrapHeaders(stale ? "stale" : "hit", existingWrap.createdAt.toISOString()),
      });
    }

    // 2. Cache miss — generate (Aggregator fans out to every provider API).
    const limited = rateLimit(`wrap-generate:${userId}`, GENERATE_LIMIT, GENERATE_WINDOW_MS);
    if (!limited.ok) {
      return tooManyRequests(limited.resetAt);
    }

    log.info("generating wrap on cache miss", { userId, year });
    const aggregator = new Aggregator(userId);
    const newWrap = await aggregator.generateWrap(year);

    return NextResponse.json(newWrap.data, {
      headers: wrapHeaders("miss", new Date().toISOString()),
    });
  } catch (error) {
    log.error("GET /api/wrap failed", error, { userId, year });
    reportError(error, { route: "api/wrap GET", userId, year });
    return NextResponse.json({ error: "Failed to generate wrap" }, { status: 500 });
  }
}

/**
 * POST forces a fresh generation, ignoring any cached wrap.
 */
export async function POST(request: NextRequest) {
  const log = createRequestLogger("api/wrap POST");
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const year = parseYear(request);

  const limited = rateLimit(`wrap-generate:${userId}`, GENERATE_LIMIT, GENERATE_WINDOW_MS);
  if (!limited.ok) {
    return tooManyRequests(limited.resetAt);
  }

  try {
    log.info("forcing wrap refresh", { userId, year });
    const aggregator = new Aggregator(userId);
    const newWrap = await aggregator.generateWrap(year);
    return NextResponse.json(newWrap.data, {
      headers: wrapHeaders("refresh", new Date().toISOString()),
    });
  } catch (error) {
    log.error("POST /api/wrap failed", error, { userId, year });
    reportError(error, { route: "api/wrap POST", userId, year });
    return NextResponse.json({ error: "Failed to refresh wrap" }, { status: 500 });
  }
}