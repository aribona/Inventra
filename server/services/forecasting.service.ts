import { db } from "@/server/db";

interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
  confidence: number;
}

export interface ForecastResult {
  itemId: string;
  itemName: string;
  currentQty: number;
  depletionDate: string | null;
  dailyVelocity: number;
  confidence: number;
  points: ForecastPoint[];
}

// Weighted Moving Average forecast (Phase 1)
export async function forecastItem(orgId: string, itemId: string, horizonDays = 30): Promise<ForecastResult> {
  const [item, allTransactions] = await Promise.all([
    db.inventoryItem.findUnique({ where: { id: itemId } }),
    db.inventoryTransaction.findMany({
      where: { orgId, itemId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!item) throw new Error("Item not found");

  const currentQty = allTransactions.reduce((sum, t) => sum + t.quantityDelta, 0);

  // Build daily sales buckets for last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000);
  const salesTransactions = allTransactions.filter(
    (t) => t.type === "SALE" && t.createdAt >= ninetyDaysAgo
  );

  const dailyBuckets: Record<string, number> = {};
  for (let i = 0; i < 90; i++) {
    const d = new Date(Date.now() - (90 - i) * 86400_000).toISOString().slice(0, 10);
    dailyBuckets[d] = 0;
  }
  for (const t of salesTransactions) {
    const key = t.createdAt.toISOString().slice(0, 10);
    if (key in dailyBuckets) dailyBuckets[key] += Math.abs(t.quantityDelta);
  }

  const dailyValues = Object.values(dailyBuckets);

  // WMA: last 7d (0.5), last 30d (0.3), last 90d (0.2)
  const avg7 = mean(dailyValues.slice(-7));
  const avg30 = mean(dailyValues.slice(-30));
  const avg90 = mean(dailyValues);

  const dailyVelocity = avg7 * 0.5 + avg30 * 0.3 + avg90 * 0.2;

  // Confidence: inverse of coefficient of variation
  const stdDev = standardDeviation(dailyValues.slice(-30));
  const cv = avg30 > 0 ? stdDev / avg30 : 1;
  const confidence = Math.max(0, Math.min(1, 1 - cv));

  // Depletion date
  let depletionDate: string | null = null;
  if (dailyVelocity > 0 && currentQty > 0) {
    const daysUntilDepletion = Math.floor(currentQty / dailyVelocity);
    const depletionTs = new Date(Date.now() + daysUntilDepletion * 86400_000);
    depletionDate = depletionTs.toISOString().slice(0, 10);
  }

  // Generate forecast points with confidence band
  const points: ForecastPoint[] = [];
  let runningQty = currentQty;
  for (let i = 1; i <= horizonDays; i++) {
    const date = new Date(Date.now() + i * 86400_000).toISOString().slice(0, 10);
    // Apply day-of-week seasonality factor (simple: weekend -20%, weekday +0%)
    const dow = new Date(Date.now() + i * 86400_000).getDay();
    const seasonalFactor = dow === 0 || dow === 6 ? 0.8 : 1.0;
    const predicted = Math.max(0, runningQty - dailyVelocity * seasonalFactor * i);
    const band = predicted * (1 - confidence) * 0.5;
    points.push({
      date,
      predicted: parseFloat(predicted.toFixed(1)),
      lower: parseFloat(Math.max(0, predicted - band).toFixed(1)),
      upper: parseFloat((predicted + band).toFixed(1)),
      confidence: parseFloat(confidence.toFixed(2)),
    });
  }

  return {
    itemId,
    itemName: item.name,
    currentQty,
    depletionDate,
    dailyVelocity: parseFloat(dailyVelocity.toFixed(2)),
    confidence: parseFloat(confidence.toFixed(2)),
    points,
  };
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}
