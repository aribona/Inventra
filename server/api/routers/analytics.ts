import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { computeHealthScore, computeKPIs, getVelocityTimeSeries, getSlowMovers } from "@/server/services/analytics.service";
import { db } from "@/server/db";

export const analyticsRouter = createTRPCRouter({
  healthScore: protectedProcedure.query(async ({ ctx }) => {
    return computeHealthScore(ctx.orgId);
  }),

  kpis: protectedProcedure.query(async ({ ctx }) => {
    return computeKPIs(ctx.orgId);
  }),

  velocityTimeSeries: protectedProcedure
    .input(z.object({ days: z.number().int().positive().max(365).default(30) }))
    .query(async ({ ctx, input }) => {
      return getVelocityTimeSeries(ctx.orgId, input.days);
    }),

  slowMovers: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      return getSlowMovers(ctx.orgId, input.limit);
    }),

  topItems: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
      const transactions = await db.inventoryTransaction.findMany({
        where: { orgId: ctx.orgId, type: "SALE", createdAt: { gte: thirtyDaysAgo } },
        include: { item: { include: { category: true } } },
      });

      const byItem: Record<string, { name: string; category: string; units: number; revenue: number }> = {};
      for (const t of transactions) {
        if (!byItem[t.itemId]) {
          byItem[t.itemId] = {
            name: t.item.name,
            category: t.item.category?.name ?? "—",
            units: 0,
            revenue: 0,
          };
        }
        byItem[t.itemId].units += Math.abs(t.quantityDelta);
        byItem[t.itemId].revenue += Math.abs(t.quantityDelta) * Number(t.unitCostAtTime);
      }

      return Object.entries(byItem)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.units - a.units)
        .slice(0, input.limit);
    }),

  wasteByCategory: protectedProcedure
    .input(z.object({ days: z.number().int().positive().max(365).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 86400_000);
      const transactions = await db.inventoryTransaction.findMany({
        where: { orgId: ctx.orgId, type: "WASTE", createdAt: { gte: since } },
        include: { item: { include: { category: true } } },
      });

      const byCategory: Record<string, { name: string; value: number; cost: number }> = {};
      for (const t of transactions) {
        const cat = t.item.category?.name ?? "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = { name: cat, value: 0, cost: 0 };
        byCategory[cat].value += Math.abs(t.quantityDelta);
        byCategory[cat].cost += Math.abs(t.quantityDelta) * Number(t.unitCostAtTime);
      }

      return Object.values(byCategory).sort((a, b) => b.cost - a.cost);
    }),

  inventoryAging: protectedProcedure.query(async ({ ctx }) => {
    const allTransactions = await db.inventoryTransaction.findMany({
      where: { orgId: ctx.orgId },
    });

    const lastMovement: Record<string, Date> = {};
    for (const t of allTransactions) {
      if (!lastMovement[t.itemId] || t.createdAt > lastMovement[t.itemId]) {
        lastMovement[t.itemId] = t.createdAt;
      }
    }

    const items = await db.inventoryItem.findMany({ where: { orgId: ctx.orgId, isActive: true } });
    const qtyMap = new Map<string, number>();
    for (const t of allTransactions) qtyMap.set(t.itemId, (qtyMap.get(t.itemId) ?? 0) + t.quantityDelta);

    const buckets = { lt30: 0, d30_60: 0, d60_90: 0, gt90: 0 };
    const now = Date.now();

    for (const item of items) {
      if ((qtyMap.get(item.id) ?? 0) <= 0) continue;
      const last = lastMovement[item.id];
      if (!last) { buckets.gt90++; continue; }
      const ageDays = (now - last.getTime()) / 86400_000;
      if (ageDays < 30) buckets.lt30++;
      else if (ageDays < 60) buckets.d30_60++;
      else if (ageDays < 90) buckets.d60_90++;
      else buckets.gt90++;
    }

    return [
      { label: "< 30 days", value: buckets.lt30, fill: "var(--chart-3)" },
      { label: "30–60 days", value: buckets.d30_60, fill: "var(--chart-4)" },
      { label: "60–90 days", value: buckets.d60_90, fill: "var(--chart-5)" },
      { label: "> 90 days", value: buckets.gt90, fill: "oklch(0.62 0.22 20)" },
    ];
  }),
});
