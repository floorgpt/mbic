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
  fetchMonthlyAveragesPerDealer,
  fetchRevenueSummary,
  fetchRevenueTrend,
  fetchTopCollections,
  fetchTopDealers,
  fetchTopRepsByRevenue,
} from "@/lib/supabase/queries";

export const revalidate = 60;

export default async function DashboardPage() {
  const [
    summary,
    trend,
    topDealers,
    topCollections,
    monthlyAverages,
    topReps,
  ] = await Promise.all([
    fetchRevenueSummary(),
    fetchRevenueTrend(),
    fetchTopDealers(5),
    fetchTopCollections(),
    fetchMonthlyAveragesPerDealer(),
    fetchTopRepsByRevenue(10),
  ]);

  const latestPerDealer = new Map<
    string,
    { month: string; avg: number }
  >();

  for (const entry of monthlyAverages) {
    const current = latestPerDealer.get(entry.dealer_name);
    if (!current || entry.month > current.month) {
      latestPerDealer.set(entry.dealer_name, {
        month: entry.month,
        avg: Number(entry.monthly_avg_invoice),
      });
    }
  }

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
            value: `${summary.growthRate >= 0 ? "+" : ""}${formatPercent(summary.growthRate)}`,
            trend:
              summary.growthRate > 0
                ? "up"
                : summary.growthRate < 0
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
          value={formatPercent(summary.growthRate)}
          delta={{
            value:
              summary.growthRate >= 0
                ? "Momentum increasing"
                : "Review pipeline health",
            trend:
              summary.growthRate > 0
                ? "up"
                : summary.growthRate < 0
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
                    {formatCurrency(collection.total_sales)} lifetime
                  </p>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {formatPercent(
                    (collection.total_sales / summary.totalRevenue || 0) * 100,
                  )}{" "}
                  share
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
                {topDealers.map((dealer) => {
                  const monthly = latestPerDealer.get(dealer.dealer_name);
                  return (
                    <TableRow key={dealer.dealer_name}>
                      <TableCell className="font-medium">
                        {dealer.dealer_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(dealer.total_sales)}
                      </TableCell>
                      <TableCell className="text-right">
                        {monthly ? formatCurrency(monthly.avg) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatPercent(
                          (dealer.total_sales / summary.totalRevenue || 0) * 100,
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
                      {formatCurrency(rep.total_sales)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatNumber(rep.invoice_count)}
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
