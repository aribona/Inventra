import { db } from "@/server/db";

export interface InventoryHealthScore {
  total: number;
  breakdown: {
    stockCoverage: number;
    turnoverRate: number;
    wasteRatio: number;
    reorderCompliance: number;
    supplierReliability: number;
  };
}

export interface KPISnapshot {
  totalInventoryValue: number;
  totalItems: number;
  lowStockCount: number;
  deadStockCount: number;
  wasteThisMonth: number;
  cogsThisMonth: number;
  turnoverRate: number;
}

// Compute weighted inventory health score (0–100)
export async function computeHealthScore(orgId: string): Promise<InventoryHealthScore> {
  const [items, thirtyDayTransactions] = await Promise.all([
    db.inventoryItem.findMany({
      where: { orgId, isActive: true },
      include: { supplier: true, transactions: { take: 1, orderBy: { createdAt: "desc" } } },
    }),
    db.inventoryTransaction.findMany({
      where: {
        orgId,
        createdAt: { gte: new Date(Date.now() - 30 * 86400_000) },
      },
    }),
  ]);

  if (items.length === 0) return { total: 0, breakdown: { stockCoverage: 0, turnoverRate: 0, wasteRatio: 0, reorderCompliance: 0, supplierReliability: 0 } };

  // Stock coverage: items with current qty >= reorder point
  const quantityMap = buildQuantityMap(thirtyDayTransactions);
  const itemsAboveReorder = items.filter((item) => {
    const qty = quantityMap.get(item.id) ?? 0;
    return qty >= item.reorderPoint;
  }).length;
  const stockCoverage = Math.min((itemsAboveReorder / items.length) * 30, 30);

  // Turnover rate: SALE transactions / avg inventory value proxy
  const salesQty = thirtyDayTransactions
    .filter((t) => t.type === "SALE")
    .reduce((sum, t) => sum + Math.abs(t.quantityDelta), 0);
  const totalQty = items.reduce((sum, item) => sum + (quantityMap.get(item.id) ?? 0), 0);
  const turnover = totalQty > 0 ? Math.min((salesQty / totalQty) * 2, 1) : 0;
  const turnoverRate = turnover * 25;

  // Waste ratio
  const wasteQty = thirtyDayTransactions
    .filter((t) => t.type === "WASTE")
    .reduce((sum, t) => sum + Math.abs(t.quantityDelta), 0);
  const inQty = thirtyDayTransactions
    .filter((t) => t.type === "PURCHASE")
    .reduce((sum, t) => sum + t.quantityDelta, 0);
  const wasteRatio = inQty > 0 ? Math.max(1 - wasteQty / inQty, 0) * 20 : 20;

  // Reorder compliance
  const reorderCompliance = stockCoverage > 0 ? (itemsAboveReorder / items.length) * 15 : 0;

  // Supplier reliability
  const suppliersWithScore = items
    .map((i) => i.supplier?.reliabilityScore ?? 1)
    .filter(Boolean);
  const avgReliability = suppliersWithScore.length > 0
    ? suppliersWithScore.reduce((a, b) => a + b, 0) / suppliersWithScore.length
    : 1;
  const supplierReliability = avgReliability * 10;

  const total = Math.round(
    stockCoverage + turnoverRate + wasteRatio + reorderCompliance + supplierReliability
  );

  return {
    total: Math.min(total, 100),
    breakdown: {
      stockCoverage: Math.round(stockCoverage),
      turnoverRate: Math.round(turnoverRate),
      wasteRatio: Math.round(wasteRatio),
      reorderCompliance: Math.round(reorderCompliance),
      supplierReliability: Math.round(supplierReliability),
    },
  };
}

export async function computeKPIs(orgId: string): Promise<KPISnapshot> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400_000);

  const [items, recentTransactions, allTransactions] = await Promise.all([
    db.inventoryItem.findMany({ where: { orgId, isActive: true } }),
    db.inventoryTransaction.findMany({
      where: { orgId, createdAt: { gte: thirtyDaysAgo } },
    }),
    db.inventoryTransaction.findMany({ where: { orgId } }),
  ]);

  const quantityMap = buildQuantityMap(allTransactions);

  const totalInventoryValue = items.reduce((sum, item) => {
    const qty = quantityMap.get(item.id) ?? 0;
    return sum + qty * Number(item.unitCost);
  }, 0);

  const lowStockCount = items.filter((item) => {
    const qty = quantityMap.get(item.id) ?? 0;
    return qty <= item.reorderPoint;
  }).length;

  // Dead stock: no SALE in 90 days AND qty > 0
  const recentlySoldIds = new Set(
    allTransactions
      .filter((t) => t.type === "SALE" && t.createdAt >= ninetyDaysAgo)
      .map((t) => t.itemId)
  );
  const deadStockCount = items.filter((item) => {
    const qty = quantityMap.get(item.id) ?? 0;
    return qty > 0 && !recentlySoldIds.has(item.id);
  }).length;

  const wasteThisMonth = recentTransactions
    .filter((t) => t.type === "WASTE")
    .reduce((sum, t) => sum + Math.abs(t.quantityDelta) * Number(t.unitCostAtTime), 0);

  const cogsThisMonth = recentTransactions
    .filter((t) => t.type === "SALE")
    .reduce((sum, t) => sum + Math.abs(t.quantityDelta) * Number(t.unitCostAtTime), 0);

  const salesQty = recentTransactions
    .filter((t) => t.type === "SALE")
    .reduce((sum, t) => sum + Math.abs(t.quantityDelta), 0);
  const avgQty = items.reduce((sum, item) => sum + (quantityMap.get(item.id) ?? 0), 0) / Math.max(items.length, 1);
  const turnoverRate = avgQty > 0 ? parseFloat(((salesQty / avgQty) * (365 / 30)).toFixed(1)) : 0;

  return {
    totalInventoryValue,
    totalItems: items.length,
    lowStockCount,
    deadStockCount,
    wasteThisMonth,
    cogsThisMonth,
    turnoverRate,
  };
}

export async function getVelocityTimeSeries(orgId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400_000);
  const transactions = await db.inventoryTransaction.findMany({
    where: { orgId, type: "SALE", createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });

  // Bucket by day
  const buckets: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - i - 1) * 86400_000);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  for (const t of transactions) {
    const key = t.createdAt.toISOString().slice(0, 10);
    if (key in buckets) buckets[key] += Math.abs(t.quantityDelta);
  }

  return Object.entries(buckets).map(([date, value]) => ({ date, value }));
}

export async function getSlowMovers(orgId: string, limit = 10) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000);
  const allTransactions = await db.inventoryTransaction.findMany({ where: { orgId } });
  const recentSales = allTransactions.filter(
    (t) => t.type === "SALE" && t.createdAt >= ninetyDaysAgo
  );

  const salesByItem: Record<string, number> = {};
  for (const t of recentSales) {
    salesByItem[t.itemId] = (salesByItem[t.itemId] ?? 0) + Math.abs(t.quantityDelta);
  }

  const qtyMap = buildQuantityMap(allTransactions);

  const items = await db.inventoryItem.findMany({
    where: { orgId, isActive: true },
    include: { category: true },
  });

  return items
    .map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category?.name ?? "—",
      currentQty: qtyMap.get(item.id) ?? 0,
      soldLast90d: salesByItem[item.id] ?? 0,
      unitCost: Number(item.unitCost),
    }))
    .filter((item) => item.currentQty > 0)
    .sort((a, b) => a.soldLast90d - b.soldLast90d)
    .slice(0, limit);
}

function buildQuantityMap(transactions: Array<{ itemId: string; quantityDelta: number }>) {
  const map = new Map<string, number>();
  for (const t of transactions) {
    map.set(t.itemId, (map.get(t.itemId) ?? 0) + t.quantityDelta);
  }
  return map;
}
