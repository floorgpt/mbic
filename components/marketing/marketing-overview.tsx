"use client";

import * as React from "react";

import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

import {
  MARKETING_BRANDS,
  MARKETING_COLORS,
  marketingKpis,
  marketingTimeseries,
  type MarketingBrand,
} from "@/lib/data/marketing";
import { formatCurrency, formatNumber } from "@/lib/utils/format";

const lineChartConfig = {
  googleAds: {
    label: "Google Ads Leads",
    color: MARKETING_COLORS.googleAds,
  },
  meta: {
    label: "Meta Leads",
    color: MARKETING_COLORS.meta,
  },
} satisfies ChartConfig;

const barChartConfig = {
  googleAdsSpend: {
    label: "Google Ads Spend",
    color: MARKETING_COLORS.googleAds,
  },
  metaSpend: {
    label: "Meta Spend",
    color: MARKETING_COLORS.meta,
  },
} satisfies ChartConfig;

const KPI_ORDER: Array<{
  key: keyof (typeof marketingKpis)[MarketingBrand];
  label: string;
  formatter: (value: number) => string;
}> = [
  {
    key: "uniqueVisitors",
    label: "Unique Visitors",
    formatter: formatNumber,
  },
  {
    key: "sessions",
    label: "Sessions",
    formatter: formatNumber,
  },
  {
    key: "bounceRate",
    label: "Bounce Rate",
    formatter: (value) => `${value}%`,
  },
  {
    key: "leads",
    label: "Leads",
    formatter: formatNumber,
  },
  {
    key: "cpl",
    label: "Cost Per Lead",
    formatter: formatCurrency,
  },
  {
    key: "dailyBudget",
    label: "Daily Budget",
    formatter: formatCurrency,
  },
];

function formatMonth(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
  });
}

type Timeframe = "last7" | "thisMonth" | "lastMonth" | "thisYear";

const TIMEFRAME_OPTIONS: Array<{ value: Timeframe; label: string }> = [
  { value: "last7", label: "Last 7 days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisYear", label: "This Year" },
];

export function MarketingOverview() {
  const [brand, setBrand] = React.useState<MarketingBrand>(MARKETING_BRANDS[0]);
  const [timeframe, setTimeframe] = React.useState<Timeframe>("thisMonth");
  const kpis = marketingKpis[brand];
  const timeseries = marketingTimeseries[brand];

  const filteredTimeseries = React.useMemo(() => {
    const now = new Date();
    return timeseries.filter((point) => {
      const date = new Date(point.date);
      switch (timeframe) {
        case "last7": {
          const threshold = new Date(now);
          threshold.setDate(threshold.getDate() - 7);
          return date >= threshold;
        }
        case "thisMonth": {
          return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth()
          );
        }
        case "lastMonth": {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return (
            date.getFullYear() === lastMonth.getFullYear() &&
            date.getMonth() === lastMonth.getMonth()
          );
        }
        case "thisYear": {
          return date.getFullYear() === now.getFullYear();
        }
        default:
          return true;
      }
    });
  }, [timeframe, timeseries]);

  const leadsTimeseries = (filteredTimeseries.length
    ? filteredTimeseries
    : timeseries
  ).map((point) => ({
    date: point.date,
    googleAds: point.googleAds.leads,
    meta: point.meta.leads,
  }));

  const spendTimeseries = (filteredTimeseries.length
    ? filteredTimeseries
    : timeseries
  ).map((point) => ({
    date: point.date,
    googleAdsSpend: point.googleAds.spend,
    metaSpend: point.meta.spend,
  }));

  const totalSpend = spendTimeseries.reduce(
    (acc, point) => acc + point.googleAdsSpend + point.metaSpend,
    0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Marketing"
        title="Brand Campaign Health"
        description="Compare paid performance across CPF Floors, CPF Launchpad, and Talula Floors."
        actions={
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <Select
              value={brand}
              onValueChange={(value) => setBrand(value as MarketingBrand)}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {MARKETING_BRANDS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={timeframe}
              onValueChange={(value) => setTimeframe(value as Timeframe)}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {KPI_ORDER.map((item) => (
          <KpiCard
            key={item.key}
            title={item.label}
            value={item.formatter(kpis[item.key] as number)}
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <Card className="border-none bg-gradient-to-br from-background to-muted/60 lg:col-span-3">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-montserrat text-xl">
                Leads by Platform
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Weekly lead volume split between Google Ads and Meta.
              </p>
            </div>
            <Tabs defaultValue="leads" className="hidden sm:block">
              <TabsList className="bg-muted/60">
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="clicks" disabled>
                  Clicks
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <ChartContainer config={lineChartConfig}>
              <LineChart data={leadsTimeseries}>
                <CartesianGrid vertical={false} strokeDasharray="4 8" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatMonth}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `${value}`}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Line
                  type="monotone"
                  dataKey="googleAds"
                  stroke={MARKETING_COLORS.googleAds}
                  strokeWidth={2}
                  dot={false}
                  name="Google Ads"
                />
                <Line
                  type="monotone"
                  dataKey="meta"
                  stroke={MARKETING_COLORS.meta}
                  strokeWidth={2}
                  dot={false}
                  name="Meta"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, label) =>
                        `${label === "googleAds" ? "Google Ads" : "Meta"}: ${value} leads`
                      }
                      labelFormatter={(label) => formatMonth(label)}
                    />
                  }
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-none bg-background lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-montserrat text-xl">
              Daily Spend
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Budget cadence by platform for {brand}.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer config={barChartConfig}>
              <BarChart data={spendTimeseries}>
                <CartesianGrid vertical={false} strokeDasharray="4 8" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatMonth}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Bar
                  dataKey="googleAdsSpend"
                  fill={MARKETING_COLORS.googleAds}
                  radius={[8, 8, 0, 0]}
                  name="Google Ads"
                />
                <Bar
                  dataKey="metaSpend"
                  fill={MARKETING_COLORS.meta}
                  radius={[8, 8, 0, 0]}
                  name="Meta"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, label) =>
                        `${label === "googleAdsSpend" ? "Google Ads" : "Meta"}: ${formatCurrency(
                          Number(value),
                        )}`
                      }
                      labelFormatter={(label) => formatMonth(label)}
                    />
                  }
                />
              </BarChart>
            </ChartContainer>
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <span className="font-medium">Total Spend:</span>{" "}
              <span>{formatCurrency(totalSpend)}</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
