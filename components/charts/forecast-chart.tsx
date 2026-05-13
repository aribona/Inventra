"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

interface ForecastChartProps {
  data: ForecastPoint[];
  depletionDate: string | null;
  reorderPoint: number;
  dailyVelocity: number;
  confidence: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const predicted = payload.find((p) => p.name === "predicted");
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label && format(new Date(label), "MMM d, yyyy")}</p>
      {predicted && <p className="text-sm font-semibold">{predicted.value} units (predicted)</p>}
    </div>
  );
}

export function ForecastChart({ data, depletionDate, reorderPoint, dailyVelocity, confidence }: ForecastChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), "MMM d"),
  }));

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Depletion Forecast</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daily velocity: <span className="font-semibold text-foreground">{dailyVelocity}</span> units/day
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {Math.round(confidence * 100)}% confidence
            </Badge>
            {depletionDate && (
              <Badge variant="destructive" className="text-xs">
                Depletes {format(new Date(depletionDate), "MMM d")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-2">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={formattedData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={6} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<CustomTooltip />} />
            {/* Confidence band */}
            <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandGradient)" />
            <Area type="monotone" dataKey="lower" stroke="none" fill="var(--background)" />
            {/* Predicted line */}
            <Line type="monotone" dataKey="predicted" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="predicted" />
            {/* Reorder point reference */}
            <ReferenceLine y={reorderPoint} stroke="var(--chart-4)" strokeDasharray="4 4" label={{ value: "Reorder", fill: "var(--chart-4)", fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
