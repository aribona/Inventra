"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  index?: number;
}

export function KPICard({ title, value, change, changeLabel, icon: Icon, iconColor = "text-primary", index = 0 }: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
    >
      <Card className="relative overflow-hidden p-5 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {change !== undefined && (
              <p
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  isPositive ? "text-emerald-600 dark:text-emerald-400" : isNegative ? "text-rose-500" : "text-muted-foreground"
                )}
              >
                <TrendIcon className="h-3 w-3" />
                {Math.abs(change)}% {changeLabel ?? "vs last month"}
              </p>
            )}
          </div>
          <div className={cn("rounded-lg p-2.5", "bg-primary/8")}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
        {/* Decorative gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </Card>
    </motion.div>
  );
}
