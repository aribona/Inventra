"use client";

import { Topbar } from "@/components/layout/topbar";
import { KPICard } from "@/components/dashboard/kpi-card";
import { HealthScoreCard } from "@/components/dashboard/health-score-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { VelocityChart } from "@/components/charts/velocity-chart";
import { InventoryAgingChart } from "@/components/charts/inventory-aging-chart";
import { KPIRowSkeleton, ChartSkeleton } from "@/components/shared/loading-skeleton";
import { api } from "@/lib/trpc/client";
import {
  DollarSign,
  Package,
  AlertTriangle,
  Recycle,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function OverviewPage() {
  const { data: kpis, isLoading: kpisLoading } = api.analytics.kpis.useQuery();
  const { data: health, isLoading: healthLoading } = api.analytics.healthScore.useQuery();
  const { data: velocity, isLoading: velocityLoading } = api.analytics.velocityTimeSeries.useQuery({ days: 30 });
  const { data: aging, isLoading: agingLoading } = api.analytics.inventoryAging.useQuery();
  const { data: topItems } = api.analytics.topItems.useQuery({ limit: 5 });
  const { data: slowMovers } = api.analytics.slowMovers.useQuery({ limit: 5 });
  const { data: insights } = api.insights.list.useQuery({ includeDismissed: false });
  const dismissMutation = api.insights.dismiss.useMutation();

  const criticalInsights = insights?.filter((i) => i.priority === "CRITICAL" || i.priority === "HIGH").slice(0, 3) ?? [];

  return (
    <div className="flex flex-col">
      <Topbar title="Overview" subtitle="Inventory intelligence at a glance" />

      <div className="flex-1 space-y-6 p-6">
        {/* KPI Row */}
        {kpisLoading ? (
          <KPIRowSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              title="Total Inventory Value"
              value={`$${(kpis?.totalInventoryValue ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              icon={DollarSign}
              iconColor="text-primary"
              index={0}
            />
            <KPICard
              title="Active Items"
              value={String(kpis?.totalItems ?? 0)}
              icon={Package}
              iconColor="text-chart-2"
              index={1}
            />
            <KPICard
              title="Low Stock Items"
              value={String(kpis?.lowStockCount ?? 0)}
              icon={AlertTriangle}
              iconColor="text-amber-500"
              index={2}
            />
            <KPICard
              title="Waste This Month"
              value={`$${(kpis?.wasteThisMonth ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              icon={Recycle}
              iconColor="text-rose-500"
              index={3}
            />
          </div>
        )}

        {/* Health score + critical insights */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            {healthLoading || !health ? (
              <ChartSkeleton height={160} />
            ) : (
              <HealthScoreCard score={health.total} breakdown={health.breakdown} />
            )}
          </div>
          <div className="lg:col-span-3 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Active Alerts</h2>
              <Link href="/insights">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  View all <Badge variant="secondary" className="text-[10px] h-4 px-1">{insights?.length ?? 0}</Badge>
                </Button>
              </Link>
            </div>
            {criticalInsights.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/20 p-8 text-center">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All clear — no urgent alerts</p>
                <p className="text-xs text-muted-foreground mt-1">Insights refresh every 6 hours</p>
              </div>
            ) : (
              <div className="space-y-2">
                {criticalInsights.map((insight, i) => (
                  <InsightCard
                    key={insight.id}
                    {...insight}
                    itemName={insight.item?.name}
                    onDismiss={(id) => dismissMutation.mutate({ id })}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Velocity chart + Aging */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {velocityLoading || !velocity ? <ChartSkeleton /> : <VelocityChart data={velocity} />}
          </div>
          <div>
            {agingLoading || !aging ? <ChartSkeleton height={220} /> : <InventoryAgingChart data={aging} />}
          </div>
        </div>

        {/* Top items + Slow movers */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Top items */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-5 py-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">Top Selling Items</h3>
              </div>
              <span className="text-xs text-muted-foreground">Last 30 days</span>
            </div>
            <div className="divide-y divide-border">
              {(topItems ?? []).map((item, i) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{item.units} units</p>
                    <p className="text-xs text-muted-foreground">${item.revenue.toFixed(0)} COGS</p>
                  </div>
                </div>
              ))}
              {!topItems?.length && (
                <p className="px-5 py-8 text-center text-xs text-muted-foreground">No sales data yet</p>
              )}
            </div>
          </div>

          {/* Slow movers */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-5 py-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Slow-Moving Stock</h3>
              </div>
              <span className="text-xs text-muted-foreground">90-day window</span>
            </div>
            <div className="divide-y divide-border">
              {(slowMovers ?? []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Qty: <span className="font-semibold text-foreground">{item.currentQty}</span></p>
                    <p className="text-xs text-muted-foreground">Sold: <span className="font-semibold text-amber-600">{item.soldLast90d}</span></p>
                  </div>
                </div>
              ))}
              {!slowMovers?.length && (
                <p className="px-5 py-8 text-center text-xs text-muted-foreground">No slow movers detected</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
