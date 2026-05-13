"use client";

import { motion } from "framer-motion";
import { X, AlertTriangle, Info, TrendingDown, RefreshCw, AlertCircle, CloudSun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InsightPriority, InsightType } from "@/lib/generated/prisma/enums";

interface InsightCardProps {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  body: string;
  itemName?: string | null;
  generatedAt: Date;
  onDismiss?: (id: string) => void;
  index?: number;
}

const priorityConfig: Record<InsightPriority, { label: string; badgeClass: string; borderClass: string }> = {
  CRITICAL: { label: "Critical", badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900", borderClass: "border-l-rose-500" },
  HIGH: { label: "High", badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900", borderClass: "border-l-amber-500" },
  MEDIUM: { label: "Medium", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900", borderClass: "border-l-blue-500" },
  LOW: { label: "Low", badgeClass: "bg-muted text-muted-foreground", borderClass: "border-l-muted-foreground/30" },
};

const typeIcons: Record<InsightType, React.ElementType> = {
  REORDER: RefreshCw,
  WASTE: AlertTriangle,
  VELOCITY: TrendingDown,
  ANOMALY: AlertCircle,
  FORECAST: CloudSun,
  SEASONAL: CloudSun,
};

export function InsightCard({ id, type, priority, title, body, itemName, generatedAt, onDismiss, index = 0 }: InsightCardProps) {
  const config = priorityConfig[priority];
  const Icon = typeIcons[type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      layout
    >
      <Card className={cn("relative border-l-4 p-4", config.borderClass)}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 font-semibold", config.badgeClass)}>
                {config.label}
              </Badge>
              {itemName && (
                <span className="text-[11px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                  {itemName}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug mb-1">{title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
            <p className="mt-2 text-[11px] text-muted-foreground/60">
              {new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-foreground"
              onClick={() => onDismiss(id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
