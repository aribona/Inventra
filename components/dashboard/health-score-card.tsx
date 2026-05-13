"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthScoreCardProps {
  score: number;
  breakdown: {
    stockCoverage: number;
    turnoverRate: number;
    wasteRatio: number;
    reorderCompliance: number;
    supplierReliability: number;
  };
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-rose-500";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Attention";
}

const breakdown_labels: Record<string, string> = {
  stockCoverage: "Stock Coverage",
  turnoverRate: "Turnover Rate",
  wasteRatio: "Waste Ratio",
  reorderCompliance: "Reorder Compliance",
  supplierReliability: "Supplier Reliability",
};

const breakdown_max: Record<string, number> = {
  stockCoverage: 30,
  turnoverRate: 25,
  wasteRatio: 20,
  reorderCompliance: 15,
  supplierReliability: 10,
};

export function HealthScoreCard({ score, breakdown }: HealthScoreCardProps) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Inventory Health Score
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent className="max-w-56 text-xs">
              Composite score across stock coverage, turnover, waste, reorder compliance, and supplier reliability.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex gap-8 items-center">
        {/* Circular gauge */}
        <div className="relative shrink-0">
          <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90">
            <circle cx={50} cy={50} r={42} fill="none" stroke="currentColor" strokeWidth={8} className="text-muted/40" />
            <motion.circle
              cx={50}
              cy={50}
              r={42}
              fill="none"
              stroke="currentColor"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className={scoreColor(score)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className={cn("text-2xl font-bold", scoreColor(score))}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {score}
            </motion.span>
            <span className="text-[10px] text-muted-foreground font-medium">/100</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-2">
          <p className={cn("text-sm font-semibold mb-3", scoreColor(score))}>{scoreLabel(score)}</p>
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-muted-foreground">{breakdown_labels[key]}</span>
                <span className="font-medium text-foreground">
                  {val}/{breakdown_max[key]}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(val / breakdown_max[key]) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
