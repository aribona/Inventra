"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Package,
  Hash,
  Barcode,
  DollarSign,
  Layers,
  Truck,
  AlertTriangle,
  Wand2,
  Plus,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { BarcodeScanner } from "./barcode-scanner";

import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  sku: z.string().min(1, "SKU is required").max(100),
  barcode: z.string().max(100).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  unitCost: z.coerce.number().nonnegative("Must be ≥ 0"),
  sellingPrice: z.coerce.number().nonnegative().optional().or(z.literal("")),
  reorderPoint: z.coerce.number().int().nonnegative(),
  reorderQuantity: z.coerce.number().int().positive("Must be > 0"),
  minStockLevel: z.coerce.number().int().nonnegative(),
  maxStockLevel: z.coerce.number().int().positive("Must be > 0"),
});

// Explicit type — z.coerce infers as unknown through Standard Schema; declare manually
type FormValues = {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  supplierId?: string;
  unitOfMeasure: string;
  unitCost: number;
  sellingPrice?: number | "";
  reorderPoint: number;
  reorderQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
};

const UNIT_OPTIONS = [
  "each", "pair", "box", "case", "pack",
  "kg", "g", "lb", "oz",
  "liter", "ml", "gallon",
  "meter", "cm", "inch", "foot",
  "roll", "sheet", "bag",
];

// ─── Inline Create Category Dialog ───────────────────────────────────────────

function CreateCategoryDialog({ onCreated }: { onCreated: (id: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");

  const createMutation = api.inventory.createCategory.useMutation({
    onSuccess: (cat) => {
      onCreated(cat.id, cat.name);
      setOpen(false);
      setName("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="flex items-center gap-1.5 text-xs text-primary hover:underline ml-1 cursor-pointer"
      >
        <Plus className="h-3 w-3" /> New category
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create category</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Beverages"
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) createMutation.mutate({ name: name.trim(), color });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-9 rounded-md border border-input cursor-pointer bg-transparent p-0.5"
              />
              <span className="text-xs text-muted-foreground font-mono">{color}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            size="sm"
            onClick={() => createMutation.mutate({ name: name.trim(), color })}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline Create Supplier Dialog ───────────────────────────────────────────

function CreateSupplierDialog({ onCreated }: { onCreated: (id: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contactName: "", email: "", phone: "", leadTimeDays: "7" });

  const createMutation = api.inventory.createSupplier.useMutation({
    onSuccess: (supplier) => {
      onCreated(supplier.id, supplier.name);
      setOpen(false);
      setForm({ name: "", contactName: "", email: "", phone: "", leadTimeDays: "7" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center gap-1.5 text-xs text-primary hover:underline ml-1 cursor-pointer">
        <Plus className="h-3 w-3" /> New supplier
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add supplier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {(["name", "contactName", "email", "phone"] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <Label className="text-xs font-medium capitalize">
                {field === "contactName" ? "Contact name" : field}
                {field !== "name" && <span className="text-muted-foreground ml-1">(optional)</span>}
              </Label>
              <Input
                value={form[field]}
                onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                type={field === "email" ? "email" : "text"}
                className="h-9 text-sm"
                placeholder={field === "email" ? "supplier@example.com" : field === "phone" ? "+1 555-0100" : ""}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Lead time (days)</Label>
            <Input
              value={form.leadTimeDays}
              onChange={(e) => setForm((p) => ({ ...p, leadTimeDays: e.target.value }))}
              type="number"
              min={0}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            size="sm"
            onClick={() =>
              createMutation.mutate({
                name: form.name.trim(),
                contactName: form.contactName || undefined,
                email: form.email || undefined,
                phone: form.phone || undefined,
                leadTimeDays: Number(form.leadTimeDays) || 7,
              })
            }
            disabled={!form.name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add supplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function ItemForm() {
  const router = useRouter();
  const [extraCategories, setExtraCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [extraSuppliers, setExtraSuppliers] = useState<Array<{ id: string; name: string }>>([]);

  const { data: categories } = api.inventory.categories.useQuery();
  const { data: suppliers } = api.inventory.suppliers.useQuery();

  const allCategories = [...(categories ?? []), ...extraCategories.filter((e) => !categories?.find((c) => c.id === e.id))];
  const allSuppliers = [...(suppliers ?? []), ...extraSuppliers.filter((e) => !suppliers?.find((s) => s.id === e.id))];

  const createItem = api.inventory.create.useMutation({
    onSuccess: (item) => router.push(`/inventory/${item.id}`),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      unitOfMeasure: "each",
      reorderPoint: 10,
      reorderQuantity: 50,
      minStockLevel: 5,
      maxStockLevel: 500,
    },
  });

  const nameValue = watch("name");

  function generateSKU() {
    const base = nameValue
      ? nameValue.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
      : "ITEM";
    const suffix = Math.floor(1000 + Math.random() * 9000);
    setValue("sku", `${base}-${suffix}`, { shouldValidate: true });
  }

  async function onSubmit(data: FormValues) {
    await createItem.mutateAsync({
      name: data.name,
      sku: data.sku,
      barcode: data.barcode || undefined,
      description: data.description || undefined,
      categoryId: data.categoryId || undefined,
      supplierId: data.supplierId || undefined,
      unitOfMeasure: data.unitOfMeasure,
      unitCost: data.unitCost,
      sellingPrice: data.sellingPrice ? Number(data.sellingPrice) : undefined,
      reorderPoint: data.reorderPoint,
      reorderQuantity: data.reorderQuantity,
      minStockLevel: data.minStockLevel,
      maxStockLevel: data.maxStockLevel,
    });
  }

  const isBusy = isSubmitting || createItem.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Basic Information ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="p-6">
          <SectionHeader icon={Package} title="Basic Information" description="Name, identifier, and description for this item" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Item name" required error={errors.name?.message}>
                <Input
                  {...register("name")}
                  placeholder="e.g. Organic Whole Milk 1L"
                  className={cn("h-9 text-sm", errors.name && "border-destructive")}
                />
              </Field>
            </div>

            <Field label="SKU" required error={errors.sku?.message} hint="Unique stock-keeping unit identifier">
              <div className="flex gap-2">
                <Input
                  {...register("sku")}
                  placeholder="e.g. MILK-1001"
                  className={cn("h-9 text-sm font-mono", errors.sku && "border-destructive")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 text-xs"
                  onClick={generateSKU}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Auto
                </Button>
              </div>
            </Field>

            <Field label="Barcode" error={errors.barcode?.message} hint="EAN-13, UPC, QR, etc. (optional)">
              <div className="flex gap-2">
                <Input
                  {...register("barcode")}
                  placeholder="e.g. 5901234123457"
                  className="h-9 text-sm font-mono"
                />
                <BarcodeScanner
                  onScan={(value) => setValue("barcode", value, { shouldValidate: true })}
                />
              </div>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Description" error={errors.description?.message}>
                <Textarea
                  {...register("description")}
                  placeholder="Optional notes about this item — storage requirements, variants, supplier notes..."
                  className="min-h-20 text-sm resize-none"
                />
              </Field>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Classification ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07, duration: 0.3 }}>
        <Card className="p-6">
          <SectionHeader icon={Layers} title="Classification" description="Category, supplier, and unit of measurement" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Category" error={errors.categoryId?.message}>
              <div>
                <Select
                  value={watch("categoryId") ?? ""}
                  onValueChange={(v: string | null) => setValue("categoryId", v ?? undefined)}
                >
                  <SelectTrigger className="h-9 text-sm w-full">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          {"color" in c && (
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c.color as string }} />
                          )}
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CreateCategoryDialog
                  onCreated={(id, name) => {
                    setExtraCategories((p) => [...p, { id, name }]);
                    setValue("categoryId", id);
                  }}
                />
              </div>
            </Field>

            <Field label="Supplier" error={errors.supplierId?.message}>
              <div>
                <Select
                  value={watch("supplierId") ?? ""}
                  onValueChange={(v: string | null) => setValue("supplierId", v ?? undefined)}
                >
                  <SelectTrigger className="h-9 text-sm w-full">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allSuppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CreateSupplierDialog
                  onCreated={(id, name) => {
                    setExtraSuppliers((p) => [...p, { id, name }]);
                    setValue("supplierId", id);
                  }}
                />
              </div>
            </Field>

            <Field label="Unit of measure" required error={errors.unitOfMeasure?.message}>
              <Select
                value={watch("unitOfMeasure")}
                onValueChange={(v: string | null) => setValue("unitOfMeasure", v ?? "each", { shouldValidate: true })}
              >
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Card>
      </motion.div>

      {/* ── Pricing ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.3 }}>
        <Card className="p-6">
          <SectionHeader icon={DollarSign} title="Pricing" description="Cost and selling price for margin and COGS tracking" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Unit cost" required error={errors.unitCost?.message} hint="What you pay per unit (used for COGS)">
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-2.5 text-sm text-muted-foreground">$</span>
                <Input
                  {...register("unitCost")}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={cn("h-9 text-sm pl-6", errors.unitCost && "border-destructive")}
                />
              </div>
            </Field>

            <Field label="Selling price" error={errors.sellingPrice?.message} hint="Optional — for margin calculations">
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-2.5 text-sm text-muted-foreground">$</span>
                <Input
                  {...register("sellingPrice")}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="h-9 text-sm pl-6"
                />
              </div>
            </Field>
          </div>
        </Card>
      </motion.div>

      {/* ── Stock Settings ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21, duration: 0.3 }}>
        <Card className="p-6">
          <SectionHeader icon={AlertTriangle} title="Stock Settings" description="Thresholds that drive alerts, forecasts, and reorder recommendations" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Reorder point" required error={errors.reorderPoint?.message} hint="Trigger alert below this qty">
              <Input
                {...register("reorderPoint")}
                type="number"
                min="0"
                step="1"
                className={cn("h-9 text-sm", errors.reorderPoint && "border-destructive")}
              />
            </Field>

            <Field label="Reorder qty" required error={errors.reorderQuantity?.message} hint="Recommended order size">
              <Input
                {...register("reorderQuantity")}
                type="number"
                min="1"
                step="1"
                className={cn("h-9 text-sm", errors.reorderQuantity && "border-destructive")}
              />
            </Field>

            <Field label="Min stock" required error={errors.minStockLevel?.message} hint="Critical low threshold">
              <Input
                {...register("minStockLevel")}
                type="number"
                min="0"
                step="1"
                className={cn("h-9 text-sm", errors.minStockLevel && "border-destructive")}
              />
            </Field>

            <Field label="Max stock" required error={errors.maxStockLevel?.message} hint="Overstock ceiling">
              <Input
                {...register("maxStockLevel")}
                type="number"
                min="1"
                step="1"
                className={cn("h-9 text-sm", errors.maxStockLevel && "border-destructive")}
              />
            </Field>
          </div>

          {/* Visual guide */}
          <div className="mt-5 rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Stock level zones</p>
            <div className="flex h-2 w-full rounded-full overflow-hidden gap-0.5">
              <div className="bg-rose-500 rounded-l-full" style={{ width: "10%" }} />
              <div className="bg-amber-500" style={{ width: "20%" }} />
              <div className="bg-emerald-500 flex-1" />
              <div className="bg-blue-400 rounded-r-full" style={{ width: "15%" }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
              <span className="text-rose-500">Critical</span>
              <span className="text-amber-500">Low</span>
              <span className="text-emerald-500">Healthy</span>
              <span className="text-blue-400">Overstock</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Actions ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28, duration: 0.3 }}
        className="flex items-center justify-between gap-3 pb-8"
      >
        <Button
          type="button"
          variant="ghost"
          className="gap-2 text-sm"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4" />
          Cancel
        </Button>

        <div className="flex gap-3">
          <Button type="submit" className="gap-2 text-sm min-w-32" disabled={isBusy}>
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                Add to inventory
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {createItem.isError && (
        <p className="text-sm text-destructive text-center">
          {createItem.error.message ?? "Something went wrong. Please try again."}
        </p>
      )}
    </form>
  );
}
