import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { forecastItem } from "@/server/services/forecasting.service";
import { db } from "@/server/db";

export const forecastingRouter = createTRPCRouter({
  forItem: protectedProcedure
    .input(z.object({ itemId: z.string(), horizonDays: z.number().int().positive().max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      return forecastItem(ctx.orgId, input.itemId, input.horizonDays);
    }),

  lowStockAlerts: protectedProcedure
    .input(z.object({ withinDays: z.number().int().positive().max(60).default(14) }))
    .query(async ({ ctx, input }) => {
      const allTransactions = await db.inventoryTransaction.findMany({ where: { orgId: ctx.orgId } });
      const qtyMap = new Map<string, number>();
      for (const t of allTransactions) qtyMap.set(t.itemId, (qtyMap.get(t.itemId) ?? 0) + t.quantityDelta);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
      const recentSales = allTransactions.filter((t) => t.type === "SALE" && t.createdAt >= thirtyDaysAgo);
      const velocityMap = new Map<string, number>();
      for (const t of recentSales) {
        velocityMap.set(t.itemId, (velocityMap.get(t.itemId) ?? 0) + Math.abs(t.quantityDelta) / 30);
      }

      const items = await db.inventoryItem.findMany({
        where: { orgId: ctx.orgId, isActive: true },
        include: { category: true },
      });

      return items
        .map((item) => {
          const qty = qtyMap.get(item.id) ?? 0;
          const velocity = velocityMap.get(item.id) ?? 0;
          const daysUntilDepletion = velocity > 0 ? qty / velocity : Infinity;
          return {
            id: item.id,
            name: item.name,
            sku: item.sku,
            category: item.category?.name ?? "—",
            currentQty: qty,
            dailyVelocity: parseFloat(velocity.toFixed(2)),
            daysUntilDepletion: isFinite(daysUntilDepletion) ? Math.floor(daysUntilDepletion) : null,
            reorderPoint: item.reorderPoint,
            unitCost: Number(item.unitCost),
          };
        })
        .filter((i) => i.daysUntilDepletion !== null && i.daysUntilDepletion <= input.withinDays)
        .sort((a, b) => (a.daysUntilDepletion ?? 999) - (b.daysUntilDepletion ?? 999));
    }),
});
