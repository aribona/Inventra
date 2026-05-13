import { db } from "@/server/db";
import { computeKPIs } from "./analytics.service";
import type { InsightPriority, InsightType } from "@/lib/generated/prisma/enums";

interface RawInsight {
  itemId?: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

// Generates rule-based insights for an org. Optionally enriches with Claude API.
export async function generateInsights(orgId: string): Promise<void> {
  const [kpis, items, allTransactions] = await Promise.all([
    computeKPIs(orgId),
    db.inventoryItem.findMany({
      where: { orgId, isActive: true },
      include: { category: true, supplier: true },
    }),
    db.inventoryTransaction.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const insights: RawInsight[] = [];
  const qtyMap = buildQtyMap(allTransactions);

  for (const item of items) {
    const qty = qtyMap.get(item.id) ?? 0;
    const recentSales = allTransactions.filter(
      (t) =>
        t.itemId === item.id &&
        t.type === "SALE" &&
        t.createdAt >= new Date(Date.now() - 30 * 86400_000)
    );
    const prevSales = allTransactions.filter(
      (t) =>
        t.itemId === item.id &&
        t.type === "SALE" &&
        t.createdAt >= new Date(Date.now() - 60 * 86400_000) &&
        t.createdAt < new Date(Date.now() - 30 * 86400_000)
    );

    const recentVol = recentSales.reduce((s, t) => s + Math.abs(t.quantityDelta), 0);
    const prevVol = prevSales.reduce((s, t) => s + Math.abs(t.quantityDelta), 0);

    // Low stock / reorder
    if (qty <= item.reorderPoint && qty > 0) {
      const daysLeft = recentVol > 0 ? Math.floor((qty / (recentVol / 30))) : null;
      insights.push({
        itemId: item.id,
        type: "REORDER",
        priority: qty <= item.minStockLevel ? "CRITICAL" : "HIGH",
        title: `Reorder ${item.name}`,
        body: daysLeft
          ? `Stock is at ${qty} ${item.unitOfMeasure}s — approximately ${daysLeft} days of supply remaining at current velocity. Reorder ${item.reorderQuantity} units${item.supplier ? ` from ${item.supplier.name}` : ""}.`
          : `Stock is critically low at ${qty} ${item.unitOfMeasure}s — below reorder point of ${item.reorderPoint}. Place a purchase order now.`,
        data: { currentQty: qty, reorderPoint: item.reorderPoint, reorderQty: item.reorderQuantity, daysLeft },
      });
    }

    // Out of stock
    if (qty <= 0) {
      insights.push({
        itemId: item.id,
        type: "REORDER",
        priority: "CRITICAL",
        title: `${item.name} is out of stock`,
        body: `This item has zero inventory. Sales may be lost. Expedite a purchase order immediately.`,
        data: { currentQty: 0 },
      });
    }

    // Velocity drop anomaly (>40% drop month over month)
    if (prevVol > 0 && recentVol < prevVol * 0.6) {
      const drop = Math.round(((prevVol - recentVol) / prevVol) * 100);
      insights.push({
        itemId: item.id,
        type: "ANOMALY",
        priority: "MEDIUM",
        title: `Sales velocity dropped ${drop}% for ${item.name}`,
        body: `${item.name} sold ${recentVol} units in the last 30 days vs ${prevVol} the prior 30 days — a ${drop}% decline. Review pricing, availability, and demand trends.`,
        data: { recentVol, prevVol, dropPercent: drop },
      });
    }

    // Waste detection
    const wasteRecent = allTransactions
      .filter((t) => t.itemId === item.id && t.type === "WASTE" && t.createdAt >= new Date(Date.now() - 30 * 86400_000))
      .reduce((s, t) => s + Math.abs(t.quantityDelta), 0);
    if (wasteRecent > 0 && recentVol > 0 && wasteRecent / (recentVol + wasteRecent) > 0.1) {
      const pct = Math.round((wasteRecent / (recentVol + wasteRecent)) * 100);
      insights.push({
        itemId: item.id,
        type: "WASTE",
        priority: pct > 25 ? "HIGH" : "MEDIUM",
        title: `High waste rate on ${item.name}`,
        body: `${pct}% of ${item.name} inventory moved this month was recorded as waste (${wasteRecent} ${item.unitOfMeasure}s). Investigate storage conditions, expiry dates, or over-ordering patterns.`,
        data: { wasteUnits: wasteRecent, wastePercent: pct },
      });
    }
  }

  // Org-level: dead stock alert
  if (kpis.deadStockCount > 0) {
    insights.push({
      type: "VELOCITY",
      priority: kpis.deadStockCount > 5 ? "HIGH" : "MEDIUM",
      title: `${kpis.deadStockCount} items with no sales in 90 days`,
      body: `You have ${kpis.deadStockCount} items that haven't moved in 3 months. Consider running promotions, liquidating, or removing them to free up working capital.`,
      data: { deadStockCount: kpis.deadStockCount },
    });
  }

  // Upsert insights (deduplicate by org + item + type, 24h window)
  const oneDayAgo = new Date(Date.now() - 86400_000);
  for (const insight of insights) {
    const existing = await db.aiInsight.findFirst({
      where: {
        orgId,
        itemId: insight.itemId ?? null,
        type: insight.type,
        generatedAt: { gte: oneDayAgo },
        isDismissed: false,
      },
    });
    if (!existing) {
      await db.aiInsight.create({
        data: {
          orgId,
          itemId: insight.itemId,
          type: insight.type,
          priority: insight.priority,
          title: insight.title,
          body: insight.body,
          data: insight.data as Parameters<typeof db.aiInsight.create>[0]["data"]["data"],
          expiresAt: new Date(Date.now() + 7 * 86400_000),
        },
      });
    }
  }
}

function buildQtyMap(transactions: Array<{ itemId: string; quantityDelta: number }>) {
  const map = new Map<string, number>();
  for (const t of transactions) map.set(t.itemId, (map.get(t.itemId) ?? 0) + t.quantityDelta);
  return map;
}
