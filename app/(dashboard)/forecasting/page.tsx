"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { api } from "@/lib/trpc/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartSkeleton } from "@/components/shared/loading-skeleton";
import { AlertTriangle, Calendar, TrendingDown, Zap } from "lucide-react";
import { format } from "date-fns";

export default function ForecastingPage() {
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [horizon, setHorizon] = useState(30);

  const { data: itemsData } = api.inventory.list.useQuery({ limit: 100 });
  const { data: alerts } = api.forecasting.lowStockAlerts.useQuery({ withinDays: 14 });
  const { data: forecast, isLoading: forecastLoading } = api.forecasting.forItem.useQuery(
    { itemId: selectedItemId!, horizonDays: horizon },
    { enabled: !!selectedItemId }
  );

  const items = itemsData?.items ?? [];

  return (
    <div className="flex flex-col">
      <Topbar title="Forecasting" subtitle="Predict depletion, optimize reorder cycles" />

      <div className="flex-1 space-y-6 p-6">
        {/* Depletion alerts strip */}
        {alerts && alerts.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {alerts.length} items depleting within 14 days
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.slice(0, 8).map((alert) => (
                <button
                  key={alert.id}
                  className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-background px-3 py-1.5 text-xs hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors cursor-pointer"
                  onClick={() => setSelectedItemId(alert.id)}
                >
                  <span className="font-medium">{alert.name}</span>
                  <Badge variant="outline" className="text-[10px] py-0 h-4 border-amber-300 text-amber-600">
                    {alert.daysUntilDepletion}d
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Item selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Select item to forecast:</span>
          </div>
          <Select value={selectedItemId ?? ""} onValueChange={(v: string | null) => setSelectedItemId(v ?? undefined)}>
            <SelectTrigger className="h-9 w-64 text-sm">
              <SelectValue placeholder="Choose an inventory item..." />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} <span className="text-muted-foreground font-mono text-xs ml-1">({item.sku})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
            <SelectTrigger className="h-9 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedItemId ? (
          forecastLoading || !forecast ? (
            <ChartSkeleton height={280} />
          ) : (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Current Stock</span>
                  </div>
                  <p className="text-2xl font-bold">{forecast.currentQty}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Daily Velocity</span>
                  </div>
                  <p className="text-2xl font-bold">{forecast.dailyVelocity}</p>
                  <p className="text-xs text-muted-foreground">units/day</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Est. Depletion</span>
                  </div>
                  {forecast.depletionDate ? (
                    <p className="text-lg font-bold text-rose-500">
                      {format(new Date(forecast.depletionDate), "MMM d, yyyy")}
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">Insufficient velocity data</p>
                  )}
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Confidence</span>
                  </div>
                  <p className="text-2xl font-bold">{Math.round(forecast.confidence * 100)}%</p>
                  <p className="text-xs text-muted-foreground">model accuracy</p>
                </Card>
              </div>

              <ForecastChart
                data={forecast.points}
                depletionDate={forecast.depletionDate}
                reorderPoint={0}
                dailyVelocity={forecast.dailyVelocity}
                confidence={forecast.confidence}
              />

              <p className="text-xs text-muted-foreground text-center">
                Forecast uses Weighted Moving Average (WMA) with day-of-week seasonality. Confidence reflects 30-day demand variability.
              </p>
            </div>
          )
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
            <div className="text-center">
              <TrendingDown className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Select an item to view its depletion forecast</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Or click any alert above to jump directly</p>
            </div>
          </div>
        )}

        {/* Full alert table */}
        {alerts && alerts.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="border-b border-border bg-muted/20 px-5 py-3">
              <h3 className="text-sm font-semibold">All Items Depleting Within 14 Days</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Item</th>
                  <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Category</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-muted-foreground">Current Qty</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-muted-foreground">Daily Velocity</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-muted-foreground">Days Left</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-muted-foreground">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => setSelectedItemId(alert.id)}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium">{alert.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{alert.sku}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{alert.category}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{alert.currentQty}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{alert.dailyVelocity}/day</td>
                    <td className="px-5 py-3 text-right">
                      <Badge
                        className={alert.daysUntilDepletion! <= 3
                          ? "bg-rose-500/10 text-rose-600 border-rose-200 border"
                          : "bg-amber-500/10 text-amber-600 border-amber-200 border"
                        }
                      >
                        {alert.daysUntilDepletion} days
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                      ${(alert.currentQty * alert.unitCost).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
