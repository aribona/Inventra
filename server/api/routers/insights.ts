import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { generateInsights } from "@/server/services/ai-insights.service";

export const insightsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        type: z.enum(["REORDER", "WASTE", "VELOCITY", "ANOMALY", "FORECAST", "SEASONAL"]).optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        includeDismissed: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      return db.aiInsight.findMany({
        where: {
          orgId: ctx.orgId,
          isDismissed: input.includeDismissed ? undefined : false,
          type: input.type,
          priority: input.priority,
        },
        include: { item: { select: { name: true, sku: true } } },
        orderBy: [{ priority: "desc" }, { generatedAt: "desc" }],
      });
    }),

  dismiss: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return db.aiInsight.update({
        where: { id: input.id, orgId: ctx.orgId },
        data: { isDismissed: true },
      });
    }),

  regenerate: protectedProcedure.mutation(async ({ ctx }) => {
    await generateInsights(ctx.orgId);
    return { success: true };
  }),

  counts: protectedProcedure.query(async ({ ctx }) => {
    const insights = await db.aiInsight.findMany({
      where: { orgId: ctx.orgId, isDismissed: false },
      select: { priority: true },
    });
    return {
      total: insights.length,
      critical: insights.filter((i) => i.priority === "CRITICAL").length,
      high: insights.filter((i) => i.priority === "HIGH").length,
      medium: insights.filter((i) => i.priority === "MEDIUM").length,
      low: insights.filter((i) => i.priority === "LOW").length,
    };
  }),
});
