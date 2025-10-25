import {
  ArrowUpRight,
  LineChart as LineChartIcon,
  TrendingUp,
  Users,
} from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { RevenueTrend } from "@/components/charts/revenue-trend";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/format";
import {
  getOrgKpis,
  getOrgMonthly,
  getTopCollections,
  getTopDealers,
  getTopReps,
} from "@/lib/mbic-dashboard";

export const revalidate = 60;

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function resolveDateParam(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return formatDate(parsed);
}

type DashboardSearchParams = Record<string, string | string[] | undefined>;
type DashboardPageProps = {
  searchParams?: DashboardSearchParams | Promise<DashboardSearchParams>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams =
    searchParams && typeof (searchParams as Promise<unknown>)?.then === "function"
      ? await (searchParams as Promise<DashboardSearchParams>)
      : ((searchParams as DashboardSearchParams) ?? {});

  const now = new Date();
  const defaultFrom = formatDate(new Date(now.getFullYear(), 0, 1));
  const defaultTo = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));

  const from = resolveDateParam(normalizeParam(resolvedSearchParams?.from), defaultFrom);
  const to = resolveDateParam(normalizeParam(resolvedSearchParams?.to), defaultTo);

  const [kpis, monthly, collections, dealers, reps] = await Promise.all([
    getOrgKpis({ from, to }),
    getOrgMonthly({ from, to }),
    getTopCollections({ from, to, topN: 6 }),
    getTopDealers({ from, to, topN: 5 }),
    getTopReps({ from, to, topN: 10 }),
  ]);

  const summary = {
    totalRevenue: Number(kpis.revenue_ytd?.toFixed(2) ?? 0),
    growthRate: kpis.growth_rate,
    activeDealers: kpis.active_dealers,
  };

  const trend = monthly.map((item) => ({
    month: item.month,
    total_sales: Number(item.month_total.toFixed(2)),
  }));

  const revenueYtd = summary.totalRevenue || 0;

  const topDealers = dealers.map((dealer) => {
    const revenueShare =
      revenueYtd > 0 ? Number(((dealer.revenue_ytd / revenueYtd) * 100).toFixed(1)) : 0;
    return {
      customer_id: dealer.customer_id,
      dealer_name: dealer.dealer_name,
      revenue: Number(dealer.revenue_ytd.toFixed(2)),
      latest_month_avg: Number(dealer.monthly_avg.toFixed(2)),
      average_invoice: Number(dealer.monthly_avg.toFixed(2)),
      revenue_share: revenueShare,
    };
  });

  const topCollections = collections.map((collection) => ({
    collection: collection.collection,
    revenue: Number(collection.revenue.toFixed(2)),
    revenue_share: collection.share_pct,
  }));

  const topReps = reps.map((rep) => ({
    rep_id: rep.rep_id,
    rep_name: rep.rep_name,
    revenue: Number(rep.revenue.toFixed(2)),
    invoices: rep.invoices,
    customer_count: rep.active_dealers,
  }));

  const hasGrowthRate = summary.growthRate != null;
  const growthRateValue = summary.growthRate ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="CPF Floors MBIC Overview"
        description="High-level KPIs across sales, marketing, and customer sentiment."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Revenue YTD"
          value={formatCurrency(summary.totalRevenue)}
          delta={{
            value: hasGrowthRate
              ? `${growthRateValue >= 0 ? "+" : ""}${formatPercent(growthRateValue)}`
              : "No month-over-month delta",
            trend:
              hasGrowthRate && growthRateValue > 0
                ? "up"
                : hasGrowthRate && growthRateValue < 0
                  ? "down"
                  : "neutral",
            description: "vs last month",
          }}
          icon={TrendingUp}
          className="xl:col-span-2"
        />
        <KpiCard
          title="Active Dealers"
          value={formatNumber(summary.activeDealers)}
          delta={{
            value: `${summary.activeDealers} total partners`,
            trend: "neutral",
            description: "selling in the last 90 days",
          }}
          icon={Users}
        />
        <KpiCard
          title="Growth Rate"
          value={hasGrowthRate ? formatPercent(growthRateValue) : "—"}
          delta={{
            value: hasGrowthRate
              ? growthRateValue >= 0
                ? "Momentum increasing"
                : "Review pipeline health"
              : "Not enough data",
            trend:
              hasGrowthRate && growthRateValue > 0
                ? "up"
                : hasGrowthRate && growthRateValue < 0
                  ? "down"
                  : "neutral",
          }}
          icon={ArrowUpRight}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none bg-gradient-to-br from-background to-muted/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-montserrat text-xl">
                Monthly Revenue Trend
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Real-time reporting from Supabase sales data.
              </p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <LineChartIcon className="mr-1 size-3" />
              Gradient View
            </Badge>
          </CardHeader>
          <CardContent>
            <RevenueTrend data={trend} />
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-background to-muted/60">
          <CardHeader>
            <CardTitle className="font-montserrat text-xl">
              Top Collections
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              All-time sales performance by collection.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {topCollections.map((collection) => (
              <div
                key={collection.collection}
                className="flex items-center justify-between rounded-lg border border-dashed border-primary/20 bg-primary/5 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{collection.collection}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(collection.revenue)} lifetime
                  </p>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {formatPercent(collection.revenue_share)} share
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none bg-background">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-montserrat text-xl">
                Top Dealers by Revenue
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Year-to-date totals with latest monthly averages.
              </p>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dealer</TableHead>
                  <TableHead className="text-right">Revenue YTD</TableHead>
                  <TableHead className="text-right">Monthly Avg</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topDealers.map((dealer) => (
                  <TableRow key={dealer.customer_id}>
                    <TableCell className="font-medium">
                      {dealer.dealer_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(dealer.revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {dealer.latest_month_avg
                        ? formatCurrency(dealer.latest_month_avg)
                        : dealer.average_invoice
                          ? formatCurrency(dealer.average_invoice)
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatPercent(dealer.revenue_share)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-none bg-background">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-montserrat text-xl">
                Top Sales Reps by Revenue
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Ranked by cumulative invoice totals.
              </p>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Active Customers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topReps.map((rep, index) => (
                  <TableRow key={rep.rep_id}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{rep.rep_name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(rep.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatNumber(rep.invoices)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatNumber(rep.customer_count)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
