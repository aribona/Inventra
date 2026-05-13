"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Lightbulb,
  TrendingUp,
  Truck,
  Settings,
  Plus,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { api } from "@/lib/trpc/client";

const PAGES = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "AI Insights", href: "/insights", icon: Lightbulb },
  { label: "Forecasting", href: "/forecasting", icon: TrendingUp },
  { label: "Suppliers", href: "/suppliers", icon: Truck },
  { label: "Settings", href: "/settings", icon: Settings },
];

const ACTIONS = [
  { label: "Add inventory item", href: "/inventory/new", icon: Plus },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data } = api.inventory.list.useQuery(
    { search: search || undefined, limit: 8 },
    { enabled: open }
  );

  // Reset search when closed
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  function go(href: string) {
    router.push(href);
    onOpenChange(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search items, navigate pages..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {data?.items && data.items.length > 0 && (
            <>
              <CommandGroup heading="Inventory Items">
                {data.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => go(`/inventory/${item.id}`)}
                  >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{item.name}</span>
                    <CommandShortcut className="font-mono">{item.sku}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="Pages">
            {PAGES.map((page) => (
              <CommandItem
                key={page.href}
                value={page.href}
                onSelect={() => go(page.href)}
              >
                <page.icon className="h-4 w-4 text-muted-foreground" />
                <span>{page.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions">
            {ACTIONS.map((action) => (
              <CommandItem
                key={action.href}
                value={action.href}
                onSelect={() => go(action.href)}
              >
                <action.icon className="h-4 w-4 text-muted-foreground" />
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
