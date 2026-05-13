"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
// DialogTrigger is only used in DeleteDialog (styled directly).
// SupplierDialog uses a controlled open state with a plain div wrapper instead.
import {
  Truck,
  Plus,
  Mail,
  Phone,
  Clock,
  Star,
  Pencil,
  Trash2,
  Loader2,
  Package,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  leadTimeDays: number;
  reliabilityScore: number;
  notes: string | null;
}

interface SupplierForm {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  leadTimeDays: string;
  notes: string;
}

const EMPTY_FORM: SupplierForm = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  leadTimeDays: "7",
  notes: "",
};

// ─── Supplier Dialog (create + edit) ─────────────────────────────────────────

function SupplierDialog({
  supplier,
  onSuccess,
  trigger,
}: {
  supplier?: Supplier;
  onSuccess: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SupplierForm>(
    supplier
      ? {
          name: supplier.name,
          contactName: supplier.contactName ?? "",
          email: supplier.email ?? "",
          phone: supplier.phone ?? "",
          leadTimeDays: String(supplier.leadTimeDays),
          notes: supplier.notes ?? "",
        }
      : EMPTY_FORM
  );

  const utils = api.useUtils();

  const createMutation = api.inventory.createSupplier.useMutation({
    onSuccess: () => { utils.inventory.suppliers.invalidate(); onSuccess(); setOpen(false); setForm(EMPTY_FORM); },
  });
  const updateMutation = api.inventory.updateSupplier.useMutation({
    onSuccess: () => { utils.inventory.suppliers.invalidate(); onSuccess(); setOpen(false); },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSave() {
    const payload = {
      name: form.name.trim(),
      contactName: form.contactName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      leadTimeDays: Number(form.leadTimeDays) || 7,
      notes: form.notes.trim() || undefined,
    };
    if (supplier) {
      updateMutation.mutate({ id: supplier.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function field(key: keyof SupplierForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  return (
    <>
      <div className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </div>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v && !supplier) setForm(EMPTY_FORM); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit supplier" : "Add supplier"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Supplier name <span className="text-destructive">*</span>
            </Label>
            <Input {...field("name")} placeholder="e.g. Acme Distributors" className="h-9 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Contact name</Label>
              <Input {...field("contactName")} placeholder="Jane Smith" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Lead time (days)</Label>
              <Input {...field("leadTimeDays")} type="number" min={0} className="h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input {...field("email")} type="email" placeholder="orders@acme.com" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phone</Label>
              <Input {...field("phone")} placeholder="+1 555-0100" className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea {...field("notes")} placeholder="Payment terms, special instructions..." className="min-h-16 text-sm resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!form.name.trim() || isPending}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : supplier ? "Save changes" : "Add supplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteDialog({ supplier, onSuccess }: { supplier: Supplier; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const deleteMutation = api.inventory.deleteSupplier.useMutation({
    onSuccess: () => { utils.inventory.suppliers.invalidate(); onSuccess(); setOpen(false); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete supplier?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{supplier.name}</span> will be removed and
          unlinked from all inventory items. This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate({ id: supplier.id })}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const utils = api.useUtils();
  const { data: suppliers, isLoading } = api.inventory.suppliers.useQuery();

  return (
    <div className="flex flex-col">
      <Topbar title="Suppliers" subtitle="Manage your supplier relationships" />

      <div className="flex-1 space-y-5 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {suppliers?.length ?? 0} supplier{(suppliers?.length ?? 0) !== 1 ? "s" : ""}
          </p>
          <SupplierDialog
            onSuccess={() => utils.inventory.suppliers.invalidate()}
            trigger={
              <Button size="sm" className="h-9 gap-1.5 text-sm">
                <Plus className="h-4 w-4" />
                Add supplier
              </Button>
            }
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl border border-border animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : !suppliers?.length ? (
          <EmptyState
            icon={Truck}
            title="No suppliers yet"
            description="Add suppliers to track lead times, contact info, and reliability scores."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <Card key={supplier.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-sm truncate">{supplier.name}</h3>
                    {supplier.contactName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{supplier.contactName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-0.5 mr-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold">{supplier.reliabilityScore.toFixed(1)}</span>
                    </div>
                    <SupplierDialog
                      supplier={supplier}
                      onSuccess={() => utils.inventory.suppliers.invalidate()}
                      trigger={
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer">
                          <Pencil className="h-3.5 w-3.5" />
                        </span>
                      }
                    />
                    <DeleteDialog supplier={supplier} onSuccess={() => {}} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <a href={`mailto:${supplier.email}`} className="truncate hover:text-foreground transition-colors">
                        {supplier.email}
                      </a>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>
                      Lead time:{" "}
                      <span className="font-medium text-foreground">{supplier.leadTimeDays} days</span>
                    </span>
                  </div>
                  {supplier.notes && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
                      <Package className="h-3 w-3 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{supplier.notes}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
