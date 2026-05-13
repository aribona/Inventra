"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Package, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";

interface InventoryRow {
  id: string;
  name: string;
  sku: string;
  category?: { name: string; color: string } | null;
  currentQty: number;
  reorderPoint: number;
  unitCost: number | string;
  unitOfMeasure: string;
  isActive: boolean;
}

interface ItemTableProps {
  data: InventoryRow[];
  onRowClick?: (id: string) => void;
}

function StockBadge({ qty, reorderPoint }: { qty: number; reorderPoint: number }) {
  if (qty <= 0) return <Badge variant="destructive" className="text-[10px] py-0">Out of Stock</Badge>;
  if (qty <= reorderPoint) return <Badge className="text-[10px] py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 border">Low Stock</Badge>;
  return <Badge className="text-[10px] py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 border">In Stock</Badge>;
}

export function ItemTable({ data, onRowClick }: ItemTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<InventoryRow>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-7 text-xs" onClick={() => column.toggleSorting()}>
          Item <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground text-sm">{row.original.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.original.sku}</p>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) =>
        row.original.category ? (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: row.original.category.color }} />
            <span className="text-xs text-muted-foreground">{row.original.category.name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        ),
    },
    {
      accessorKey: "currentQty",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-7 text-xs" onClick={() => column.toggleSorting()}>
          Qty <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums">
          {row.original.currentQty} <span className="text-xs text-muted-foreground">{row.original.unitOfMeasure}</span>
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StockBadge qty={row.original.currentQty} reorderPoint={row.original.reorderPoint} />,
    },
    {
      accessorKey: "unitCost",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-7 text-xs" onClick={() => column.toggleSorting()}>
          Unit Cost <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums font-medium">
          ${Number(row.original.unitCost).toFixed(2)}
        </span>
      ),
    },
    {
      id: "value",
      header: "Stock Value",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          ${(row.original.currentQty * Number(row.original.unitCost)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: "actions",
      cell: () => <ChevronRight className="h-4 w-4 text-muted-foreground/50" />,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No inventory items"
        description="Add your first item to start tracking inventory."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="bg-muted/30 hover:bg-muted/30">
              {hg.headers.map((h) => (
                <TableHead key={h.id} className="text-xs font-medium h-10">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {table.getRowModel().rows.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  "border-b border-border transition-colors",
                  onRowClick ? "cursor-pointer hover:bg-muted/40" : ""
                )}
                onClick={() => onRowClick?.(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
