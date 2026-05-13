"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Lightbulb,
  TrendingUp,
  Truck,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/trpc/client";

const navItems = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "AI Insights", href: "/insights", icon: Lightbulb, badge: "AI" },
  { label: "Forecasting", href: "/forecasting", icon: TrendingUp },
  { label: "Suppliers", href: "/suppliers", icon: Truck },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface NavContentProps {
  onNavigate?: () => void;
}

export function NavContent({ onNavigate }: NavContentProps) {
  const pathname = usePathname();
  const { data: org } = api.settings.getOrg.useQuery();

  return (
    <div className="flex h-full flex-col px-3 py-4">
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
          Inventra
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <span
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 rounded-md bg-sidebar-accent"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10 flex-1">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="relative z-10 h-4 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide"
                  >
                    {item.badge}
                  </Badge>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Org card */}
      <div className="mt-4 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-3 py-2.5">
        <p className="text-[11px] font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-1">
          Organization
        </p>
        <p className="text-sm font-medium text-sidebar-foreground truncate">
          {org?.name ?? "—"}
        </p>
        <p className="text-xs text-sidebar-foreground/50 capitalize">
          {org?.planTier?.toLowerCase() ?? "Free"} Plan
        </p>
      </div>
    </div>
  );
}
