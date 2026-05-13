"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Topbar } from "@/components/layout/topbar";
import { InsightCard } from "@/components/dashboard/insight-card";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Lightbulb, RefreshCw, Loader2 } from "lucide-react";

type FilterType = "ALL" | "REORDER" | "WASTE" | "VELOCITY" | "ANOMALY" | "FORECAST";
type FilterPriority = "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export default function InsightsPage() {
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>("ALL");

  const { data: counts } = api.insights.counts.useQuery();
  const { data: insights, isLoading, refetch } = api.insights.list.useQuery({
    type: typeFilter === "ALL" ? undefined : typeFilter,
    priority: priorityFilter === "ALL" ? undefined : priorityFilter,
  });

  const regenerateMutation = api.insights.regenerate.useMutation({
    onSuccess: () => refetch(),
  });
  const dismissMutation = api.insights.dismiss.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="flex flex-col">
      <Topbar title="AI Insights" subtitle="Intelligent analysis of your inventory patterns" />

      <div className="flex-1 space-y-5 p-6">
        {/* Header with counts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              {counts?.critical ? (
                <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 border text-xs">
                  {counts.critical} Critical
                </Badge>
              ) : null}
              {counts?.high ? (
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 border text-xs">
                  {counts.high} High
                </Badge>
              ) : null}
              {counts?.medium ? (
                <Badge variant="outline" className="text-xs">{counts.medium} Medium</Badge>
              ) : null}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
          >
            {regenerateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh insights
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <Tabs value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as FilterPriority)}>
            <TabsList className="h-8">
              {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as FilterPriority[]).map((p) => (
                <TabsTrigger key={p} value={p} className="text-xs h-6 px-2.5">
                  {p === "ALL" ? "All priorities" : p.charAt(0) + p.slice(1).toLowerCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
            <TabsList className="h-8">
              {(["ALL", "REORDER", "WASTE", "ANOMALY", "FORECAST"] as FilterType[]).map((t) => (
                <TabsTrigger key={t} value={t} className="text-xs h-6 px-2.5">
                  {t === "ALL" ? "All types" : t.charAt(0) + t.slice(1).toLowerCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Insights list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl border border-border bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : insights?.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No insights to show"
            description="Stockpulse will analyze your inventory patterns and surface actionable recommendations here."
            action={
              <Button size="sm" onClick={() => regenerateMutation.mutate()} disabled={regenerateMutation.isPending}>
                Generate insights now
              </Button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {insights?.map((insight, i) => (
                <InsightCard
                  key={insight.id}
                  {...insight}
                  itemName={insight.item?.name}
                  onDismiss={(id) => dismissMutation.mutate({ id })}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
