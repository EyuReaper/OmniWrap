import { auth } from "@/lib/auth";
import { Aggregator } from "@/lib/services/aggregator";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const YEAR = 2025;

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

  try {
    const aggregator = new Aggregator(session.user.id);
    const newWrap = await aggregator.generateWrap(YEAR);
    return NextResponse.json(newWrap.data);
  } catch (error) {
    console.error("[API/Wrap] Refresh Error:", error);
    return NextResponse.json({ error: "Failed to refresh wrap" }, { status: 500 });
  }
}
