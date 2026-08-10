import { auth } from "@/lib/auth";
import { Aggregator } from "@/lib/services/aggregator";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { NextResponse } from "next/server";

const YEAR = 2025;

// Quota on *generation* (the expensive path: per-provider upstream API
// calls), not on serving an already-cached wrap. Ten generations/hour is
// enough for legitimate reconnect/retry use and low enough to blunt a script
// hammering the refresh button or an attacker driving up upstream API usage.
const GENERATE_LIMIT = 10;
const GENERATE_WINDOW_MS = 60 * 60 * 1000;

function tooManyRequests(resetAt: number) {
  return NextResponse.json(
    { error: "Too many wrap refreshes. Try again later." },
    { status: 429, headers: { "Retry-After": Math.ceil((resetAt - Date.now()) / 1000).toString() } },
  );
}

export async function GET() {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Check if a wrap for this year already exists to avoid heavy re-generation.
    //    @@unique([userId, year]) guarantees at most one row, so this is a single
    //    index lookup — no sort, and only the `data` column crosses the wire.
    const existingWrap = await prisma.wrap.findUnique({
      where: { userId_year: { userId: session.user.id, year: YEAR } },
      select: { data: true },
    });

    if (existingWrap) {
      console.log(`[API/Wrap] Returning existing wrap for user: ${session.user.id}`);
      return NextResponse.json(existingWrap.data);
    }

    // 2. If not, generate it (Aggregator handles fetching from all connected services)
    const limited = rateLimit(`wrap-generate:${session.user.id}`, GENERATE_LIMIT, GENERATE_WINDOW_MS);
    if (!limited.ok) {
      return tooManyRequests(limited.resetAt);
    }

    console.log(`[API/Wrap] Generating new wrap for user: ${session.user.id}`);
    const aggregator = new Aggregator(session.user.id);
    const newWrap = await aggregator.generateWrap(YEAR);

    return NextResponse.json(newWrap.data);
  } catch (error) {
    console.error("[API/Wrap] Error:", error);
    return NextResponse.json({ error: "Failed to generate wrap" }, { status: 500 });
  }
}

/**
 * POST endpoint to force a refresh of the wrap data
 */
export async function POST() {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(`wrap-generate:${session.user.id}`, GENERATE_LIMIT, GENERATE_WINDOW_MS);
  if (!limited.ok) {
    return tooManyRequests(limited.resetAt);
  }

  try {
    const aggregator = new Aggregator(session.user.id);
    const newWrap = await aggregator.generateWrap(YEAR);
    return NextResponse.json(newWrap.data);
  } catch (error) {
    console.error("[API/Wrap] Refresh Error:", error);
    return NextResponse.json({ error: "Failed to refresh wrap" }, { status: 500 });
  }
}
