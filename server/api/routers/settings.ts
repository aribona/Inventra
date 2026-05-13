import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";

export const settingsRouter = createTRPCRouter({
  getOrg: protectedProcedure.query(async ({ ctx }) => {
    return db.organization.findUnique({ where: { id: ctx.orgId } });
  }),

  updateOrg: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      return db.organization.update({
        where: { id: ctx.orgId },
        data: { name: input.name },
      });
    }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return db.user.findUnique({ where: { id: ctx.user.id } });
  }),

  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      return db.user.update({
        where: { id: ctx.user.id },
        data: { name: input.name },
      });
    }),

  getMembers: protectedProcedure.query(async ({ ctx }) => {
    return db.organizationMember.findMany({
      where: { orgId: ctx.orgId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
  }),
});
