import Image from "next/image";
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
  getCategoryTotals,
  getDealerEngagement,
  getOrgKpis,
  getOrgMonthly,
  getTopDealers,
  getTopReps,
  type CategoryRow,
  type DealerRow,
  type RepRow,
} from "@/lib/mbic-supabase";
import { fmtPct0, fmtUSD0 } from "@/lib/format";
import { formatNumber } from "@/lib/utils/format";

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

function DataPlaceholder({ message = "No data for this period." }: { message?: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function CategoryCarousel({ categories }: { categories: CategoryRow[] }) {
  if (!categories.length) {
    return <DataPlaceholder />;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {categories.map((category) => (
        <div
          key={category.category_key}
          className="flex min-w-[220px] items-center gap-3 rounded-2xl border bg-background/80 p-4 shadow-sm"
        >
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-muted/60">
            {category.icon_url ? (
              <Image
                src={category.icon_url}
                alt={category.display_name}
                width={64}
                height={64}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-sm font-semibold text-muted-foreground">
                {category.display_name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-medium">{category.display_name}</p>
            <p className="text-xs text-muted-foreground">
              {fmtUSD0(category.total_sales)} • {fmtPct0(category.share_pct)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as DashboardSearchParams));
  const from = resolveDateParam(normalizeParam(params.from), DEFAULT_FROM);
  const to = resolveDateParam(normalizeParam(params.to), DEFAULT_TO);

  let kpisData: Awaited<ReturnType<typeof getOrgKpis>> | null = null;
  let monthlyData: Awaited<ReturnType<typeof getOrgMonthly>> = [];
  let dealerData: DealerRow[] = [];
  let repData: RepRow[] = [];
  let categoryData: CategoryRow[] = [];
  let engagementData = [] as Awaited<ReturnType<typeof getDealerEngagement>>;

  try {
    [kpisData, monthlyData, dealerData, repData, categoryData, engagementData] = await Promise.all([
      getOrgKpis(from, to),
      getOrgMonthly(from, to),
      getTopDealers(from, to, 10, 0),
      getTopReps(from, to, 10, 0),
      getCategoryTotals(from, to),
      getDealerEngagement(from, to),
    ]);
  } catch (error) {
    console.error(
      JSON.stringify({
        at: "dashboard/page",
        from,
        to,
        error: (error as Error)?.message ?? String(error),
      }),
    );
  }

  const kpis = kpisData ?? {
    revenue: 0,
    unique_dealers: 0,
    avg_invoice: 0,
    top_dealer: null,
    top_dealer_revenue: 0,
  };

  const latestEngagement = engagementData.at(-1) ?? {
    active_cnt: 0,
    inactive_cnt: 0,
    total_assigned: 0,
    active_pct: 0,
  };

  const dealerRows = (dealerData ?? []).map((dealer, index) => {
    const revenue = dealer.revenue ?? 0;
    const share = dealer.share_pct ?? (kpis.revenue ? (revenue / kpis.revenue) * 100 : 0);
    return {
      rank: index + 1,
      name: dealer.dealer_name,
      revenue,
      monthly: dealer.monthly_avg ?? 0,
      share,
      rep: dealer.rep_initials ?? "—",
    };
  });

  const repRows = (repData ?? []).map((rep, index) => ({
    rank: index + 1,
    name: rep.rep_name,
    revenue: rep.revenue ?? 0,
    monthly: rep.monthly_avg ?? 0,
    active: rep.active_customers ?? 0,
    total: rep.total_customers ?? 0,
    activePct: rep.active_pct,
  }));

  const monthlyPoints = (monthlyData ?? []).map((point) => ({
    month: point.month,
    total_sales: point.total,
  }));

  const categories = categoryData ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="CPF Floors MBIC Overview"
        description="High-level KPIs across sales, marketing, and customer sentiment."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Revenue YTD"
          value={fmtUSD0(kpis.revenue)}
          delta={{
            value: "—",
            trend: "neutral",
            description: "No Year-over-Year delta • data available from 2025-01-01 to 2025-09-30",
          }}
          icon={TrendingUp}
          className="xl:col-span-2"
        />
        <KpiCard
          title="Active Dealers"
          value={formatNumber(latestEngagement.active_cnt)}
          delta={{
            value: `${formatNumber(latestEngagement.total_assigned)} total assigned`,
            trend: "neutral",
            description: `${fmtPct0(latestEngagement.active_pct)} active`,
          }}
          icon={Users}
        />
        <KpiCard
          title="Growth Rate"
          value={"—"}
          delta={{
            value: "Not enough data",
            trend: "neutral",
          }}
          icon={ArrowUpRight}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none bg-gradient-to-br from-background to-muted/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-montserrat text-xl">Monthly Revenue Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Real-time reporting from Supabase sales data.</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <LineChartIcon className="mr-1 size-3" />
              Gradient View
            </Badge>
          </CardHeader>
          <CardContent>
            {monthlyPoints.length ? <RevenueTrend data={monthlyPoints} /> : <DataPlaceholder />}
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-background to-muted/60">
          <CardHeader>
            <CardTitle className="font-montserrat text-xl">Top Products</CardTitle>
            <p className="text-xs text-muted-foreground">Leading categories by revenue share.</p>
          </CardHeader>
          <CardContent>
            <TopProductsGrid products={categories} />
          </CardContent>
        </Card>
      </section>

      <Card className="border-none bg-background">
        <CardHeader>
          <CardTitle className="font-montserrat text-xl">Category Engagement</CardTitle>
          <p className="text-xs text-muted-foreground">Every active segment this period.</p>
        </CardHeader>
        <CardContent>
          <CategoryCarousel categories={categories} />
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none bg-background">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-montserrat text-xl">Top Dealers by Revenue</CardTitle>
              <p className="text-xs text-muted-foreground">Year-to-date totals with latest monthly averages.</p>
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
                      <TableRow key={`${dealer.rank}-${dealer.name}`}>
                        <TableCell className="text-muted-foreground">#{dealer.rank}</TableCell>
                        <TableCell className="font-medium">{dealer.name}</TableCell>
                        <TableCell className="text-muted-foreground">{dealer.rep}</TableCell>
                        <TableCell className="text-right">{fmtUSD0(dealer.revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmtUSD0(dealer.monthly)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {dealer.share == null ? "—" : fmtPct0(dealer.share)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-2 text-right text-[10px] uppercase tracking-wide text-muted-foreground">Scroll →</p>
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
              <p className="text-xs text-muted-foreground">Ranked by year-to-date performance.</p>
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
                      <TableRow key={`${rep.rank}-${rep.name}`}>
                        <TableCell className="text-muted-foreground">#{rep.rank}</TableCell>
                        <TableCell className="font-medium">{rep.name}</TableCell>
                        <TableCell className="text-right">{fmtUSD0(rep.revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmtUSD0(rep.monthly)}</TableCell>
                        <TableCell className="text-right">{formatNumber(rep.active)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatNumber(rep.total)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {rep.activePct == null ? "—" : fmtPct0(rep.activePct)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-2 text-right text-[10px] uppercase tracking-wide text-muted-foreground">Scroll →</p>
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
