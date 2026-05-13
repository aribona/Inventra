"use client";

import { useRef, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { ItemTable } from "@/components/inventory/item-table";
import { api } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Filter, Download, Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── CSV Utilities ─────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  "name", "sku", "barcode", "description", "unitOfMeasure",
  "unitCost", "sellingPrice", "reorderPoint", "reorderQuantity",
  "minStockLevel", "maxStockLevel",
];

function buildCSV(rows: Record<string, string | number>[]) {
  const header = [
    "Name", "SKU", "Barcode", "Description", "Category", "Supplier",
    "Unit", "Unit Cost", "Selling Price", "Current Qty",
    "Reorder Point", "Reorder Qty", "Min Stock", "Max Stock",
  ];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [header.map(escape).join(","), ...rows.map((r) => Object.values(r).map(escape).join(","))].join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// RFC 4180-compliant CSV parser: handles quoted fields, embedded commas,
// embedded newlines, and escaped quotes ("").
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 2; }
      else if (ch === '"') { inQuotes = false; i++; }
      else { cell += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === ',') { row.push(cell); cell = ""; i++; }
      else if (ch === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ""; i += 2; }
      else if (ch === '\n' || ch === '\r') { row.push(cell); rows.push(row); row = []; cell = ""; i++; }
      else { cell += ch; i++; }
    }
  }
  if (cell || row.length > 0) { row.push(cell); rows.push(row); }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  return rows.slice(1)
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
}

interface ParsedRow {
  name: string;
  sku: string;
  unitCost: number;
  unitOfMeasure: string;
  reorderPoint: number;
  reorderQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  barcode?: string;
  description?: string;
  sellingPrice?: number;
  _error?: string;
}

function validateRow(raw: Record<string, string>, index: number): ParsedRow {
  const name = raw.name ?? raw["item name"] ?? "";
  const sku = raw.sku ?? "";
  const unitCost = parseFloat(raw["unit cost"] ?? raw.unitcost ?? "0");
  if (!name) return { name, sku, unitCost: 0, unitOfMeasure: "each", reorderPoint: 10, reorderQuantity: 50, minStockLevel: 5, maxStockLevel: 500, _error: `Row ${index + 1}: name is required` };
  if (!sku) return { name, sku, unitCost: 0, unitOfMeasure: "each", reorderPoint: 10, reorderQuantity: 50, minStockLevel: 5, maxStockLevel: 500, _error: `Row ${index + 1}: sku is required` };
  if (isNaN(unitCost)) return { name, sku, unitCost: 0, unitOfMeasure: "each", reorderPoint: 10, reorderQuantity: 50, minStockLevel: 5, maxStockLevel: 500, _error: `Row ${index + 1}: unit cost must be a number` };
  const sp = raw["selling price"] ?? raw.sellingprice ?? "";
  return {
    name,
    sku,
    unitCost,
    unitOfMeasure: raw["unit"] ?? raw.unitofmeasure ?? raw.unit ?? "each",
    reorderPoint: parseInt(raw["reorder point"] ?? raw.reorderpoint ?? "10") || 10,
    reorderQuantity: parseInt(raw["reorder qty"] ?? raw.reorderquantity ?? "50") || 50,
    minStockLevel: parseInt(raw["min stock"] ?? raw.minstocklevel ?? "5") || 5,
    maxStockLevel: parseInt(raw["max stock"] ?? raw.maxstocklevel ?? "500") || 500,
    barcode: raw.barcode || undefined,
    description: raw.description || undefined,
    sellingPrice: sp ? parseFloat(sp) : undefined,
  };
}

// ─── Import Dialog ─────────────────────────────────────────────────────────────

function ImportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const batchCreate = api.inventory.batchCreate.useMutation();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = parseCSV(ev.target?.result as string);
      setRows(raw.map((r, i) => validateRow(r, i)));
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const valid = rows.filter((r) => !r._error);
    if (!valid.length) return;
    setImporting(true);
    const res = await batchCreate.mutateAsync(valid);
    setResult(res);
    setImporting(false);
    onSuccess();
  }

  function handleClose(v: boolean) {
    setOpen(v);
    if (!v) { setRows([]); setResult(null); if (fileRef.current) fileRef.current.value = ""; }
  }

  const validRows = rows.filter((r) => !r._error);
  const errorRows = rows.filter((r) => r._error);

  function downloadTemplate() {
    const template = "name,sku,unitCost,unitOfMeasure,sellingPrice,reorderPoint,reorderQuantity,minStockLevel,maxStockLevel,barcode,description\nOrganic Milk 1L,MILK-1001,1.50,each,3.99,20,100,10,500,,Full-fat organic milk";
    downloadCSV(template, "inventra-import-template.csv");
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm" onClick={() => setOpen(true)}>
        <Upload className="h-3.5 w-3.5" />
        Import
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import inventory from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Upload a CSV with columns: <span className="font-mono text-foreground">name, sku, unitCost</span> (required) and optionally unitOfMeasure, sellingPrice, reorderPoint, reorderQuantity, minStockLevel, maxStockLevel, barcode, description.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => fileRef.current?.click()}>
                    Choose file
                  </Button>
                  <button onClick={downloadTemplate} className="text-xs text-primary hover:underline">
                    Download template
                  </button>
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </div>

              {rows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{rows.length} rows parsed</span>
                    <span className="flex gap-3">
                      <span className="text-emerald-600">{validRows.length} valid</span>
                      {errorRows.length > 0 && <span className="text-destructive">{errorRows.length} errors</span>}
                    </span>
                  </div>

                  {errorRows.length > 0 && (
                    <div className="rounded-md bg-destructive/10 p-2.5 space-y-1 max-h-24 overflow-y-auto">
                      {errorRows.map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                          {r._error}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-md border border-border overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 sticky top-0">
                        <tr>
                          {["Name", "SKU", "Unit Cost", "Unit"].map((h) => (
                            <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {validRows.map((r, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1.5 truncate max-w-32">{r.name}</td>
                            <td className="px-2 py-1.5 font-mono">{r.sku}</td>
                            <td className="px-2 py-1.5">${r.unitCost.toFixed(2)}</td>
                            <td className="px-2 py-1.5">{r.unitOfMeasure}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <div>
                <p className="text-sm font-semibold">Import complete</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.created} items created{result.skipped > 0 ? `, ${result.skipped} skipped (duplicate SKU)` : ""}{result.errors.length > 0 ? `, ${result.errors.length} failed` : ""}.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button
              size="sm"
              onClick={handleImport}
              disabled={validRows.length === 0 || importing}
            >
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Import {validRows.length > 0 ? `${validRows.length} items` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);

  const utils = api.useUtils();

  const { data, isLoading } = api.inventory.list.useQuery({
    search: search || undefined,
    categoryId: categoryId === "all" ? undefined : categoryId,
    lowStock: lowStock || undefined,
    page,
    limit: 50,
  });
  const { data: categories } = api.inventory.categories.useQuery();

  const [exporting, setExporting] = useState(false);
  const exportQuery = api.inventory.exportAll.useQuery(undefined, { enabled: false });

  async function handleExport() {
    setExporting(true);
    const items = await exportQuery.refetch();
    if (items.data) {
      const csv = buildCSV(items.data as unknown as Record<string, string | number>[]);
      downloadCSV(csv, `inventra-${new Date().toISOString().split("T")[0]}.csv`);
    }
    setExporting(false);
  }

  return (
    <div className="flex flex-col">
      <Topbar
        title="Inventory"
        subtitle={`${data?.total ?? 0} items across all categories`}
      />

      <div className="flex-1 space-y-4 p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, SKU, barcode..."
              className="pl-8 h-9 text-sm"
            />
          </div>

          <Select
            value={categoryId ?? "all"}
            onValueChange={(v: string | null) => { setCategoryId(!v || v === "all" ? undefined : v); setPage(1); }}
          >
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={lowStock ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5 text-sm"
            onClick={() => { setLowStock(!lowStock); setPage(1); }}
          >
            <Filter className="h-3.5 w-3.5" />
            Low stock
            {lowStock && data?.total !== undefined && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">{data.total}</Badge>
            )}
          </Button>

          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-sm"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export
            </Button>
            <ImportDialog onSuccess={() => utils.inventory.list.invalidate()} />
            <Button size="sm" className="h-9 gap-1.5 text-sm" onClick={() => router.push("/inventory/new")}>
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <ItemTable
            data={(data?.items ?? []).map((item) => ({
              ...item,
              unitCost: Number(item.unitCost),
            }))}
            onRowClick={(id) => router.push(`/inventory/${id}`)}
          />
        )}

        {/* Pagination */}
        {data && data.total > data.limit && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} of {data.total} items
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page * data.limit >= data.total} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
