"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  ChevronLeft,
  Package,
  Edit,
  Plus,
  TrendingUp,
  TrendingDown,
  Trash2,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  ArrowLeftRight,
} from "lucide-react";

import { api } from "@/lib/trpc/client";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

// ─── Transaction type config ──────────────────────────────────────────────────

const TX_CONFIG = {
  PURCHASE:   { label: "Purchase",   icon: ArrowDownLeft,  color: "text-emerald-500", sign: "+" },
  SALE:       { label: "Sale",       icon: ArrowUpRight,   color: "text-blue-500",    sign: "-" },
  ADJUSTMENT: { label: "Adjustment", icon: RefreshCw,      color: "text-amber-500",   sign: "±" },
  WASTE:      { label: "Waste",      icon: Trash2,         color: "text-rose-500",    sign: "-" },
  TRANSFER:   { label: "Transfer",   icon: ArrowLeftRight, color: "text-purple-500",  sign: "±" },
  RETURN:     { label: "Return",     icon: RotateCcw,      color: "text-teal-500",    sign: "+" },
} as const;

type TxType = keyof typeof TX_CONFIG;

// ─── Add Transaction Dialog ───────────────────────────────────────────────────

function AddTransactionDialog({ itemId, itemName, onSuccess }: { itemId: string; itemName: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TxType>("PURCHASE");
  const [qty, setQty] = useState("");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");

  const addTx = api.inventory.addTransaction.useMutation({
    onSuccess: () => {
      onSuccess();
      setOpen(false);
      setQty("");
      setRef("");
      setNotes("");
    },
  });

  const isNegative = type === "SALE" || type === "WASTE";
  const qtyNum = Number(qty);
  const delta = isNegative ? -Math.abs(qtyNum) : Math.abs(qtyNum);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Record transaction
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record transaction</DialogTitle>
          <p className="text-xs text-muted-foreground">{itemName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Transaction type</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(TX_CONFIG) as TxType[]).map((t) => {
                const cfg = TX_CONFIG[t];
                const Icon = cfg.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-[11px] font-medium transition-colors cursor-pointer",
                      type === t
                        ? "border-primary bg-primary/8 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", type === t ? "text-primary" : cfg.color)} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Quantity
              <span className="text-muted-foreground ml-1 font-normal">
                ({isNegative ? "will be subtracted" : "will be added"})
              </span>
            </Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="e.g. 100"
              className="h-9 text-sm"
            />
            {qty && !isNaN(qtyNum) && qtyNum > 0 && (
              <p className={cn("text-xs font-medium", isNegative ? "text-rose-500" : "text-emerald-500")}>
                {isNegative ? "−" : "+"}{Math.abs(qtyNum)} units will be recorded
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Reference <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Invoice #, PO #, order ID..."
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any relevant context..."
              className="min-h-16 text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            size="sm"
            onClick={() =>
              addTx.mutate({
                itemId,
                type,
                quantityDelta: delta,
                referenceNumber: ref || undefined,
                notes: notes || undefined,
              })
            }
            disabled={!qty || isNaN(qtyNum) || qtyNum <= 0 || addTx.isPending}
          >
            {addTx.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-bold tabular-nums", accent)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: item, isLoading, refetch } = api.inventory.byId.useQuery({ id });

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Topbar title="Item Detail" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col">
        <Topbar title="Item Not Found" />
        <EmptyState icon={Package} title="Item not found" description="This item may have been deleted." />
      </div>
    );
  }

  const currentQty = item.currentQty;
  const stockValue = currentQty * Number(item.unitCost);
  const margin = item.sellingPrice
    ? ((Number(item.sellingPrice) - Number(item.unitCost)) / Number(item.sellingPrice)) * 100
    : null;

  let stockStatus: { label: string; class: string } = { label: "In Stock", class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 border" };
  if (currentQty <= 0) stockStatus = { label: "Out of Stock", class: "bg-destructive/10 text-destructive border-destructive/30 border" };
  else if (currentQty <= item.minStockLevel) stockStatus = { label: "Critical", class: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 border" };
  else if (currentQty <= item.reorderPoint) stockStatus = { label: "Low Stock", class: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 border" };

  return (
    <div className="flex flex-col">
      <Topbar
        title={item.name}
        subtitle={`SKU: ${item.sku}${item.barcode ? ` · Barcode: ${item.barcode}` : ""}`}
      />

      <div className="flex-1 space-y-5 p-6 max-w-5xl mx-auto w-full">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2 text-sm -ml-2" onClick={() => router.push("/inventory")}>
            <ChevronLeft className="h-4 w-4" /> Inventory
          </Button>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", stockStatus.class)}>{stockStatus.label}</Badge>
            <AddTransactionDialog itemId={item.id} itemName={item.name} onSuccess={() => refetch()} />
          </div>
        </div>

        {/* KPI strip */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <StatTile
                label="Current Stock"
                value={`${currentQty}`}
                sub={item.unitOfMeasure}
                accent={currentQty <= item.reorderPoint ? "text-amber-500" : undefined}
              />
              <StatTile
                label="Stock Value"
                value={`$${stockValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                sub="at unit cost"
              />
              <StatTile
                label="Unit Cost"
                value={`$${Number(item.unitCost).toFixed(4)}`}
                sub={item.sellingPrice ? `Sell: $${Number(item.sellingPrice).toFixed(2)}` : "No selling price set"}
              />
              {margin !== null ? (
                <StatTile
                  label="Gross Margin"
                  value={`${margin.toFixed(1)}%`}
                  sub="per unit"
                  accent={margin > 0 ? "text-emerald-500" : "text-rose-500"}
                />
              ) : (
                <StatTile label="Reorder Point" value={`${item.reorderPoint}`} sub={`Order ${item.reorderQuantity} units`} />
              )}
            </div>

            {/* Stock level bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Stock level</span>
                <span>{currentQty} / {item.maxStockLevel} max</span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    currentQty <= 0 ? "bg-destructive" :
                    currentQty <= item.minStockLevel ? "bg-rose-500" :
                    currentQty <= item.reorderPoint ? "bg-amber-500" :
                    "bg-emerald-500"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((currentQty / item.maxStockLevel) * 100, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                {/* Reorder point marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-amber-400"
                  style={{ left: `${(item.reorderPoint / item.maxStockLevel) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>0</span>
                <span className="text-amber-500">Reorder at {item.reorderPoint}</span>
                <span>{item.maxStockLevel}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Item details */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07, duration: 0.3 }}
          >
            <Card className="p-5 h-full">
              <h3 className="text-sm font-semibold mb-4">Item Details</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Name", value: item.name },
                  { label: "SKU", value: item.sku, mono: true },
                  { label: "Barcode", value: item.barcode ?? "—", mono: !!item.barcode },
                  { label: "Category", value: item.category?.name ?? "—" },
                  { label: "Supplier", value: item.supplier?.name ?? "—" },
                  { label: "Unit", value: item.unitOfMeasure },
                  { label: "Min stock", value: String(item.minStockLevel) },
                  { label: "Max stock", value: String(item.maxStockLevel) },
                  { label: "Added", value: format(new Date(item.createdAt), "MMM d, yyyy") },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className={cn("text-right font-medium truncate", mono && "font-mono text-xs")}>{value}</span>
                  </div>
                ))}
                {item.description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground mb-1">Description</p>
                      <p className="text-xs leading-relaxed">{item.description}</p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Transaction history */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.3 }}
          >
            <Card className="p-0 overflow-hidden h-full">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <h3 className="text-sm font-semibold">Transaction History</h3>
                <span className="text-xs text-muted-foreground">Last {item.transactions.length} records</span>
              </div>

              {item.transactions.length === 0 ? (
                <EmptyState
                  icon={RefreshCw}
                  title="No transactions yet"
                  description="Record your first purchase, sale, or adjustment using the button above."
                />
              ) : (
                <div className="divide-y divide-border overflow-y-auto max-h-[480px]">
                  <AnimatePresence mode="popLayout">
                    {item.transactions.map((tx, i) => {
                      const cfg = TX_CONFIG[tx.type as TxType] ?? TX_CONFIG.ADJUSTMENT;
                      const Icon = cfg.icon;
                      const isPositive = tx.quantityDelta > 0;
                      return (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                        >
                          <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted", cfg.color)}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{cfg.label}</span>
                              {tx.referenceNumber && (
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {tx.referenceNumber}
                                </span>
                              )}
                            </div>
                            {tx.notes && <p className="text-xs text-muted-foreground mt-0.5">{tx.notes}</p>}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(tx.createdAt), "MMM d, yyyy 'at' h:mm a")}
                              {" · "}{"user" in tx && tx.user ? (tx.user as { name: string }).name : "System"}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn("text-sm font-bold tabular-nums", isPositive ? "text-emerald-500" : "text-rose-500")}>
                              {isPositive ? "+" : ""}{tx.quantityDelta}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ${Number(tx.unitCostAtTime).toFixed(2)}/unit
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
