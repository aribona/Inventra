import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { generateInsights } from "@/server/services/ai-insights.service";

async function runInsights(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgs = await db.organization.findMany({ select: { id: true } });

  const results = await Promise.allSettled(
    orgs.map((org) => generateInsights(org.id))
  );

  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    processed: orgs.length,
    failed,
    ok: failed === 0,
  });
}

// Vercel Cron sends GET requests (see vercel.json).
export async function GET(request: NextRequest) {
  return runInsights(request);
}

// Manual trigger via POST /api/cron/insights
export async function POST(request: NextRequest) {
  return runInsights(request);
}
