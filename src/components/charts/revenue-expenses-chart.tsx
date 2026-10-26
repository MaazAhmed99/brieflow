"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export type RevenueExpensePoint = { month: string; label: string; revenue: number; expenses: number };

// Categorical slots 1 and 2, in fixed order; both clear 3:1 on light and dark.
const chartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  expenses: { label: "Expenses", color: "var(--chart-2)" },
} satisfies ChartConfig;

// Two measures in the same unit, so one shared axis (never two). Grouped
// columns with a 2px gap, a legend for the two series, a hover tooltip, and a
// screen-reader table with the same numbers.
export function RevenueExpensesChart({ data, currency }: { data: RevenueExpensePoint[]; currency: string }) {
  const compact = new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 0 });
  const full = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });

  return (
    <figure>
      <ChartContainer config={chartConfig} className="h-72 w-full" aria-hidden="true">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="24%" barGap={2}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => compact.format(v)} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={<ChartTooltipContent formatter={(value, name) => `${chartConfig[name as keyof typeof chartConfig]?.label}: ${full.format(Number(value))}`} />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ChartContainer>
      <figcaption className="sr-only">
        <table>
          <caption>Revenue and expenses per month</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Revenue</th>
              <th scope="col">Expenses</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.month}>
                <th scope="row">{point.label}</th>
                <td>{full.format(point.revenue)}</td>
                <td>{full.format(point.expenses)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
