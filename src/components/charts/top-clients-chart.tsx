"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export type ClientRevenue = { clientName: string; value: number };

const chartConfig = { value: { label: "Revenue", color: "var(--chart-1)" } } satisfies ChartConfig;

// Ranked horizontal bars, one series: value at each bar tip (in text colour,
// not the bar colour), no gridlines needed, hover tooltip, and a table for
// screen readers.
export function TopClientsChart({ data, currency }: { data: ClientRevenue[]; currency: string }) {
  const compact = new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });

  return (
    <figure>
      <ChartContainer config={chartConfig} className="w-full" style={{ height: data.length * 40 + 16 }} aria-hidden="true">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 4 }} barCategoryGap="28%">
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="clientName"
            tickLine={false}
            axisLine={false}
            width={140}
            tickFormatter={(name: string) => (name.length > 20 ? `${name.slice(0, 19)}…` : name)}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={<ChartTooltipContent formatter={(value) => full.format(Number(value))} />}
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} maxBarSize={20}>
            <LabelList
              dataKey="value"
              position="right"
              className="fill-foreground"
              fontSize={12}
              formatter={(value) => compact.format(Number(value))}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <figcaption className="sr-only">
        <table>
          <caption>Revenue by client, last 12 months</caption>
          <thead>
            <tr>
              <th scope="col">Client</th>
              <th scope="col">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.clientName}>
                <th scope="row">{row.clientName}</th>
                <td>{full.format(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
