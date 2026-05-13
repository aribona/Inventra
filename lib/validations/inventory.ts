import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(100),
  barcode: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  unitOfMeasure: z.string().min(1).max(50),
  unitCost: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative().optional(),
  reorderPoint: z.number().int().nonnegative(),
  reorderQuantity: z.number().int().positive(),
  minStockLevel: z.number().int().nonnegative(),
  maxStockLevel: z.number().int().positive(),
});

export const updateItemSchema = createItemSchema.partial().extend({
  id: z.string().uuid(),
});

export const createTransactionSchema = z.object({
  itemId: z.string().uuid(),
  type: z.enum(["PURCHASE", "SALE", "ADJUSTMENT", "WASTE", "TRANSFER", "RETURN"]),
  quantityDelta: z.number().int(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const listItemsSchema = z.object({
  orgId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
