"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export type RevenuePoint = { month: string; label: string; value: number };

const chartConfig = {
  value: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

// Single series, so no legend: the card title names it. Thin columns with a
// 4px rounded top, recessive gridlines, compact y-axis ticks and a hover
// tooltip; a table view of the same numbers sits below for screen readers.
export function RevenueChart({ data, currency }: { data: RevenuePoint[]; currency: string }) {
  const compact = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 0,
  });
  const full = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });

  return (
    <figure>
      <ChartContainer config={chartConfig} className="h-64 w-full" aria-hidden="true">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => compact.format(value)}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={<ChartTooltipContent formatter={(value) => full.format(Number(value))} />}
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ChartContainer>
      <figcaption className="sr-only">
        <table>
          <caption>Revenue received per month</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.month}>
                <th scope="row">{point.label}</th>
                <td>{full.format(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
