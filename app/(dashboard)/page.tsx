import {
  ArrowUpRight,
  LineChart as LineChartIcon,
  TrendingUp,
  Users,
} from "lucide-react";

import { TopProductsGrid } from "@/components/dashboard/top-products-grid";
import { RevenueTrend } from "@/components/charts/revenue-trend";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
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
import {
  getOrgKpis,
  getOrgMonthly,
  getTopDealers,
  getTopProducts,
  getTopReps,
} from "@/lib/mbic-dashboard";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercentWhole,
} from "@/lib/utils/format";

export const revalidate = 60;

const DEFAULT_FROM = "2025-01-01";
const DEFAULT_TO = "2025-10-01";

type DashboardSearchParams = Record<string, string | string[] | undefined>;
type DashboardPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

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
  return parsed.toISOString().slice(0, 10);
}

function DataPlaceholder({ message = "Data available soon." }: { message?: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const sp = await (searchParams ?? Promise.resolve({} as DashboardSearchParams));

  const from = resolveDateParam(normalizeParam(sp.from), DEFAULT_FROM);
  const to = resolveDateParam(normalizeParam(sp.to), DEFAULT_TO);

  const [kpis, monthly, products, dealers, reps] = await Promise.all([
    getOrgKpis({ from, to }),
    getOrgMonthly({ from, to }),
    getTopProducts({ from, to }),
    getTopDealers({ from, to, topN: 10 }),
    getTopReps({ from, to, topN: 10 }),
  ]);

  const totalRevenue = Number(kpis.revenue_ytd.toFixed(2));
  const growthRateValue = kpis.growth_rate ?? 0;
  const revenueDeltaDescription = kpis.prior_period_available
    ? "vs prior year"
    : "No YoY — using 2025 YTD (Jan–Sep).";
  const revenueDeltaValue = kpis.prior_period_available
    ? `${growthRateValue >= 0 ? "+" : ""}${formatPercentWhole(growthRateValue)}`
    : "—";

  const trend = monthly.map((item) => ({
    month: item.month,
    total_sales: Number(item.month_total.toFixed(2)),
  }));
  const hasTrend = trend.length > 0;

  const dealerRows = dealers.map((dealer, index) => ({
    rank: index + 1,
    name: dealer.dealer_name,
    revenue: dealer.revenue_ytd,
    monthly: dealer.monthly_avg,
    share: dealer.share_pct,
    rep: dealer.rep_initials ?? "—",
  }));

  const repRows = reps.map((rep, index) => ({
    rank: index + 1,
    name: rep.rep_name,
    revenue: rep.revenue_ytd,
    monthly: rep.monthly_avg,
    active: rep.active_customers,
    total: rep.total_customers,
    activePct: rep.active_pct,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="CPF Floors MBIC Overview"
        description="High-level KPIs across sales, marketing, and customer sentiment."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Revenue YTD"
          value={formatCurrencyCompact(totalRevenue)}
          delta={{
            value: revenueDeltaValue,
            trend:
              kpis.prior_period_available && growthRateValue > 0
                ? "up"
                : kpis.prior_period_available && growthRateValue < 0
                  ? "down"
                  : "neutral",
            description: revenueDeltaDescription,
          }}
          icon={TrendingUp}
          className="xl:col-span-2"
        />
        <KpiCard
          title="Active Dealers"
          value={formatNumber(kpis.active_dealers)}
          delta={{
            value: `${kpis.active_dealers} total partners`,
            trend: "neutral",
            description: "selling in the last 90 days",
          }}
          icon={Users}
        />
        <KpiCard
          title="Growth Rate"
          value={kpis.growth_rate == null ? "—" : formatPercentWhole(growthRateValue)}
          delta={{
            value:
              kpis.growth_rate == null
                ? "Not enough data"
                : growthRateValue >= 0
                  ? "Momentum increasing"
                  : "Review pipeline health",
            trend:
              kpis.growth_rate == null
                ? "neutral"
                : growthRateValue > 0
                  ? "up"
                  : growthRateValue < 0
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
              <p className="text-xs text-muted-foreground">Real-time reporting from Supabase sales data.</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <LineChartIcon className="mr-1 size-3" />
              Gradient View
            </Badge>
          </CardHeader>
          <CardContent>
            {hasTrend ? <RevenueTrend data={trend} /> : <DataPlaceholder />}
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-background to-muted/60">
          <CardHeader>
            <CardTitle className="font-montserrat text-xl">Top Products</CardTitle>
            <p className="text-xs text-muted-foreground">Leading categories by revenue share.</p>
          </CardHeader>
          <CardContent>
            <TopProductsGrid products={products} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none bg-background">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-montserrat text-xl">Top Dealers by Revenue</CardTitle>
              <p className="text-xs text-muted-foreground">
                Year-to-date totals with latest monthly averages.
              </p>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {dealerRows.length ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Rep</TableHead>
                      <TableHead className="text-right">Revenue YTD</TableHead>
                      <TableHead className="text-right">Monthly Avg</TableHead>
                      <TableHead className="text-right">Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dealerRows.map((dealer) => (
                      <TableRow key={dealer.rank}>
                        <TableCell className="text-muted-foreground">#{dealer.rank}</TableCell>
                        <TableCell className="font-medium">{dealer.name}</TableCell>
                        <TableCell className="text-muted-foreground">{dealer.rep}</TableCell>
                        <TableCell className="text-right">{formatCurrency(dealer.revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(dealer.monthly)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatPercentWhole(dealer.share)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-2 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                  Scroll →
                </p>
              </>
            ) : (
              <DataPlaceholder />
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-background">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-montserrat text-xl">Top Sales Reps by Revenue</CardTitle>
              <p className="text-xs text-muted-foreground">Ranked by YTD performance.</p>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {repRows.length ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Rep</TableHead>
                      <TableHead className="text-right">Revenue YTD</TableHead>
                      <TableHead className="text-right">Monthly Avg</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Active %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repRows.map((rep) => (
                      <TableRow key={rep.rank}>
                        <TableCell className="text-muted-foreground">#{rep.rank}</TableCell>
                        <TableCell className="font-medium">{rep.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(rep.revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(rep.monthly)}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(rep.active)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatNumber(rep.total)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatPercentWhole(rep.activePct)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-2 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                  Scroll →
                </p>
              </>
            ) : (
              <DataPlaceholder />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
