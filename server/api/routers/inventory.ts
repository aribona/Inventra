import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { createItemSchema, updateItemSchema, createTransactionSchema } from "@/lib/validations/inventory";
import { TRPCError } from "@trpc/server";
function sumQty(transactions: Array<{ quantityDelta: number }>): number {
  return transactions.reduce((sum, t) => sum + t.quantityDelta, 0);
}

export const inventoryRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        categoryId: z.string().optional(),
        supplierId: z.string().optional(),
        isActive: z.boolean().optional(),
        lowStock: z.boolean().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId } = ctx;
      const skip = (input.page - 1) * input.limit;

      const allItems = await db.inventoryItem.findMany({
        where: { orgId, isActive: input.isActive },
        include: {
          category: true,
          supplier: true,
          transactions: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { name: "asc" },
      });

      const itemsWithQty = allItems.map((item) => ({
        ...item,
        currentQty: sumQty(item.transactions),
      }));

      let filtered = itemsWithQty;

      if (input.search) {
        const q = input.search.toLowerCase();
        filtered = filtered.filter(
          (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.barcode?.toLowerCase().includes(q)
        );
      }
      if (input.categoryId) filtered = filtered.filter((i) => i.categoryId === input.categoryId);
      if (input.supplierId) filtered = filtered.filter((i) => i.supplierId === input.supplierId);
      if (input.lowStock) filtered = filtered.filter((i) => i.currentQty <= i.reorderPoint);

      const total = filtered.length;
      const items = filtered.slice(skip, skip + input.limit).map(({ transactions: _t, ...item }) => item);

      return { items, total, page: input.page, limit: input.limit };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await db.inventoryItem.findUnique({
        where: { id: input.id },
        include: {
          category: true,
          supplier: true,
          transactions: { orderBy: { createdAt: "desc" }, take: 50, include: { user: true } },
        },
      });
      if (!item || item.orgId !== ctx.orgId) throw new TRPCError({ code: "NOT_FOUND" });
      const currentQty = sumQty(item.transactions);
      return { ...item, currentQty };
    }),

  create: protectedProcedure.input(createItemSchema).mutation(async ({ ctx, input }) => {
    const existing = await db.inventoryItem.findUnique({
      where: { orgId_sku: { orgId: ctx.orgId, sku: input.sku } },
    });
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "SKU already exists" });

    return db.inventoryItem.create({
      data: { ...input, orgId: ctx.orgId, unitCost: input.unitCost },
    });
  }),

  update: protectedProcedure.input(updateItemSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const item = await db.inventoryItem.findUnique({ where: { id } });
    if (!item || item.orgId !== ctx.orgId) throw new TRPCError({ code: "NOT_FOUND" });
    return db.inventoryItem.update({ where: { id }, data });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await db.inventoryItem.findUnique({ where: { id: input.id } });
      if (!item || item.orgId !== ctx.orgId) throw new TRPCError({ code: "NOT_FOUND" });
      return db.inventoryItem.update({ where: { id: input.id }, data: { isActive: false } });
    }),

  addTransaction: protectedProcedure
    .input(createTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await db.inventoryItem.findUnique({ where: { id: input.itemId } });
      if (!item || item.orgId !== ctx.orgId) throw new TRPCError({ code: "NOT_FOUND" });

      return db.inventoryTransaction.create({
        data: {
          ...input,
          orgId: ctx.orgId,
          userId: ctx.user.id,
          unitCostAtTime: item.unitCost,
        },
      });
    }),

  categories: protectedProcedure.query(async ({ ctx }) => {
    return db.category.findMany({ where: { orgId: ctx.orgId }, orderBy: { name: "asc" } });
  }),

  createCategory: protectedProcedure
    .input(z.object({ name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return db.category.create({ data: { ...input, orgId: ctx.orgId } });
    }),

  suppliers: protectedProcedure.query(async ({ ctx }) => {
    return db.supplier.findMany({ where: { orgId: ctx.orgId }, orderBy: { name: "asc" } });
  }),

  createSupplier: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        contactName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        leadTimeDays: z.number().int().nonnegative().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db.supplier.create({ data: { ...input, orgId: ctx.orgId } });
    }),

  updateSupplier: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        contactName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        leadTimeDays: z.number().int().nonnegative().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const supplier = await db.supplier.findUnique({ where: { id } });
      if (!supplier || supplier.orgId !== ctx.orgId) throw new TRPCError({ code: "NOT_FOUND" });
      return db.supplier.update({ where: { id }, data });
    }),

  deleteSupplier: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supplier = await db.supplier.findUnique({ where: { id: input.id } });
      if (!supplier || supplier.orgId !== ctx.orgId) throw new TRPCError({ code: "NOT_FOUND" });
      await db.inventoryItem.updateMany({
        where: { supplierId: input.id },
        data: { supplierId: null },
      });
      return db.supplier.delete({ where: { id: input.id } });
    }),

  exportAll: protectedProcedure.query(async ({ ctx }) => {
    const items = await db.inventoryItem.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      include: {
        category: { select: { name: true } },
        supplier: { select: { name: true } },
        transactions: { select: { quantityDelta: true } },
      },
      orderBy: { name: "asc" },
    });
    return items.map((item) => ({
      name: item.name,
      sku: item.sku,
      barcode: item.barcode ?? "",
      description: item.description ?? "",
      category: item.category?.name ?? "",
      supplier: item.supplier?.name ?? "",
      unitOfMeasure: item.unitOfMeasure,
      unitCost: Number(item.unitCost),
      sellingPrice: item.sellingPrice ? Number(item.sellingPrice) : "",
      currentQty: item.transactions.reduce((s, t) => s + t.quantityDelta, 0),
      reorderPoint: item.reorderPoint,
      reorderQuantity: item.reorderQuantity,
      minStockLevel: item.minStockLevel,
      maxStockLevel: item.maxStockLevel,
    }));
  }),

  batchCreate: protectedProcedure
    .input(
      z.array(
        z.object({
          name: z.string().min(1),
          sku: z.string().min(1),
          barcode: z.string().optional(),
          description: z.string().optional(),
          unitOfMeasure: z.string().default("each"),
          unitCost: z.number().nonnegative(),
          sellingPrice: z.number().nonnegative().optional(),
          reorderPoint: z.number().int().nonnegative().default(10),
          reorderQuantity: z.number().int().positive().default(50),
          minStockLevel: z.number().int().nonnegative().default(5),
          maxStockLevel: z.number().int().positive().default(500),
        })
      ).max(500)
    )
    .mutation(async ({ ctx, input }) => {
      const results = { created: 0, skipped: 0, errors: [] as string[] };
      for (const row of input) {
        const existing = await db.inventoryItem.findUnique({
          where: { orgId_sku: { orgId: ctx.orgId, sku: row.sku } },
        });
        if (existing) {
          results.skipped++;
          continue;
        }
        try {
          await db.inventoryItem.create({ data: { ...row, orgId: ctx.orgId } });
          results.created++;
        } catch {
          results.errors.push(row.sku);
        }
      }
      return results;
    }),
});
