import Image from "next/image";
import {
  ArrowUpRight,
  LineChart as LineChartIcon,
  TrendingUp,
  Users,
} from "lucide-react";

import { DealerHeatmap } from "@/components/dashboard/dealer-heatmap";
import { MonthlyRevenueTrend } from "@/components/dashboard/monthly-revenue-trend";
import { TopProductsGrid } from "@/components/dashboard/top-products-grid";
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
  getCategoryTotalsSafe,
  getDealerEngagementSafe,
  getOrgKpisSafe,
  getOrgMonthlySafe,
  getTopDealersSafe,
  getTopRepsSafe,
  type CategoryRow,
  type DealerRow,
  type DealerEngagementRow,
  type RepRow,
  type OrgKpis,
  type MonthlyPoint,
} from "@/lib/mbic-supabase";
import { fmtPct0, fmtUSD0 } from "@/lib/format";
import { formatNumber } from "@/lib/utils/format";
import { getIcon, type SafeResult } from "@/lib/utils";

export const revalidate = 60;

const DEFAULT_FROM = "2025-01-01";
const DEFAULT_TO = "2025-10-01";
const TOP_PRODUCTS_PAGE_SIZE = 6;

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

function resolveDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString().slice(0, 10);
}

function buildHref(params: DashboardSearchParams, targetPage: number) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value || key === "topProductsPage") return;
    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
    } else {
      query.set(key, value);
    }
  });
  query.set("topProductsPage", String(targetPage));
  return `?${query.toString()}`;
}

function DataPlaceholder({ message = "No data for this period." }: { message?: string }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
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
            <Image
              src={getIcon(category.icon_url ?? undefined)}
              alt={category.display_name}
              width={64}
              height={64}
              className="size-full object-contain"
              unoptimized
            />
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
  const from = resolveDate(normalizeParam(params.from), DEFAULT_FROM);
  const to = resolveDate(normalizeParam(params.to), DEFAULT_TO);

  const [kpisRes, monthlyRes, dealersRes, repsRes, categoriesRes, engagementRes] = await Promise.allSettled([
    getOrgKpisSafe(from, to),
    getOrgMonthlySafe(from, to),
    getTopDealersSafe(from, to, 10, 0),
    getTopRepsSafe(from, to, 10, 0),
    getCategoryTotalsSafe(from, to),
    getDealerEngagementSafe(from, to),
  ]);

  const extract = <T,>(
    result: PromiseSettledResult<SafeResult<T>>,
    fallback: T,
    label: string,
  ): T => {
    if (result.status === "fulfilled") {
      if (result.value?.error) {
        console.error(`Dashboard panel error (${label}):`, result.value.error);
      }
      return result.value?.data ?? fallback;
    }
    console.error(`Dashboard panel rejected (${label}):`, result.reason);
    return fallback;
  };

  const kpis = extract(
    kpisRes as PromiseSettledResult<SafeResult<OrgKpis>>,
    {
      revenue: 0,
      unique_dealers: 0,
      avg_invoice: 0,
      top_dealer: null,
      top_dealer_revenue: 0,
    },
    "kpis",
  );
  const monthly = extract(monthlyRes as PromiseSettledResult<SafeResult<MonthlyPoint[]>>, [], "monthly");
  const dealerRows = extract(dealersRes as PromiseSettledResult<SafeResult<DealerRow[]>>, [], "dealers");
  const repRows = extract(repsRes as PromiseSettledResult<SafeResult<RepRow[]>>, [], "reps");
  const categoryData = extract(categoriesRes as PromiseSettledResult<SafeResult<CategoryRow[]>>, [], "categories");
  const engagementData = extract(
    engagementRes as PromiseSettledResult<SafeResult<DealerEngagementRow[]>>,
    [],
    "engagement",
  );

  const totalRevenue = kpis.revenue ?? 0;
  const latestEngagement = engagementData.at(-1) ?? {
    active_cnt: 0,
    inactive_cnt: 0,
    total_assigned: 0,
    active_pct: 0,
  };

  const sortedCategories = [...categoryData].sort((a, b) => b.total_sales - a.total_sales);
  const topProductsTotalPages = Math.max(1, Math.ceil(sortedCategories.length / TOP_PRODUCTS_PAGE_SIZE));
  const topProductsPageParam = parseInt(normalizeParam(params.topProductsPage) ?? "1", 10);
  const currentTopProductsPage = Number.isNaN(topProductsPageParam)
    ? 1
    : Math.min(Math.max(topProductsPageParam, 1), topProductsTotalPages);

  return (
    <div className="space-y-8">
      <PageHeader
        title="CPF Floors MBIC Overview"
        description="High-level KPIs across sales, marketing, and customer sentiment."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Revenue YTD"
          value={fmtUSD0(totalRevenue)}
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
          value="—"
          delta={{ value: "Not enough data", trend: "neutral" }}
          icon={ArrowUpRight}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
            <MonthlyRevenueTrend data={monthly} />
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-background to-muted/60">
          <CardHeader>
            <CardTitle className="font-montserrat text-xl">Top Products</CardTitle>
            <p className="text-xs text-muted-foreground">Leading categories by revenue share.</p>
          </CardHeader>
          <CardContent>
            <TopProductsGrid
              products={sortedCategories}
              currentPage={currentTopProductsPage}
              pageSize={TOP_PRODUCTS_PAGE_SIZE}
              buildPageHref={(page) => buildHref(params, page)}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="border-none bg-background">
        <CardHeader>
          <CardTitle className="font-montserrat text-xl">Category Engagement</CardTitle>
          <p className="text-xs text-muted-foreground">Every active segment this period.</p>
        </CardHeader>
        <CardContent>
          <CategoryCarousel categories={sortedCategories} />
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
                    {dealerRows.map((dealer, index) => {
                      const revenue = dealer.revenue ?? 0;
                      const share = dealer.share_pct ?? (totalRevenue ? (revenue / totalRevenue) * 100 : 0);
                      return (
                        <TableRow key={`${dealer.dealer_name}-${index}`}>
                          <TableCell className="text-muted-foreground">#{index + 1}</TableCell>
                          <TableCell className="font-medium">{dealer.dealer_name}</TableCell>
                          <TableCell className="text-muted-foreground">{dealer.rep_initials ?? "—"}</TableCell>
                          <TableCell className="text-right">{fmtUSD0(revenue)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmtUSD0(dealer.monthly_avg ?? 0)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmtPct0(share)}</TableCell>
                        </TableRow>
                      );
                    })}
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
                    {repRows.map((rep, index) => (
                      <TableRow key={`${rep.rep_id}-${index}`}>
                        <TableCell className="text-muted-foreground">#{index + 1}</TableCell>
                        <TableCell className="font-medium">{rep.rep_name}</TableCell>
                        <TableCell className="text-right">{fmtUSD0(rep.revenue ?? 0)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmtUSD0(rep.monthly_avg ?? 0)}</TableCell>
                        <TableCell className="text-right">{formatNumber(rep.active_customers ?? 0)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatNumber(rep.total_customers ?? 0)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {rep.active_pct == null ? "—" : fmtPct0(rep.active_pct)}
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

      <Card className="border-none bg-background">
        <CardHeader>
          <CardTitle className="font-montserrat text-xl">Dealer Engagement Heatmap</CardTitle>
          <p className="text-xs text-muted-foreground">Trailing monthly activity excluding distribution partners.</p>
        </CardHeader>
        <CardContent>
          <DealerHeatmap data={engagementData ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
