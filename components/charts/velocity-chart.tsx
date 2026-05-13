"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface VelocityChartProps {
  data: Array<{ date: string; value: number }>;
  title?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-0.5">{label && format(new Date(label), "MMM d, yyyy")}</p>
      <p className="text-sm font-semibold text-foreground">{payload[0].value} units sold</p>
    </div>
  );
}

export function VelocityChart({ data, title = "Sales Velocity" }: VelocityChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), "MMM d"),
  }));

  return (
    <Card className="p-0 overflow-hidden">
      <CardHeader className="px-6 py-4 border-b border-border">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">Rolling daily unit sales over last 30 days</p>
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-2">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={formattedData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              interval={6}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#velocityGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--background)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
