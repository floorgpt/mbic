import Image from "next/image";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowUpRight, TrendingUp, Users } from "lucide-react";

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
import { cn, getIcon, type PanelMeta, type SafeResult } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_FROM = "2025-01-01";
const DEFAULT_TO = "2025-10-01";
const TOP_PRODUCTS_PAGE_SIZE = 6;
const DEFAULT_KPIS: OrgKpis = {
  revenue: 0,
  unique_dealers: 0,
  avg_invoice: 0,
  top_dealer: null,
  top_dealer_revenue: 0,
};

type DashboardSearchParams = Record<string, string | string[] | undefined>;

type DashboardPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

type PanelState<T> = {
  data: T;
  meta: PanelMeta;
};

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
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

function createPanelErrorMeta(message?: string): PanelMeta {
  return {
    ok: false,
    count: 0,
    ...(message ? { err: message } : {}),
  };
}

function resolvePanelResult<T>(
  result: PromiseSettledResult<SafeResult<T>>,
  fallback: T,
  label: string,
): PanelState<T> {
  if (result.status === "fulfilled" && result.value) {
    return {
      data: result.value.data ?? fallback,
      meta: result.value._meta ?? createPanelErrorMeta(`Missing meta (${label})`),
    };
  }

  const reason =
    result.status === "rejected"
      ? (result.reason as Error)?.message ?? String(result.reason)
      : "Unknown panel failure";
  console.error(`Dashboard panel rejected (${label}):`, reason);

  return {
    data: fallback,
    meta: createPanelErrorMeta(reason),
  };
}

function PanelFailureBadge({ meta, className }: { meta?: PanelMeta; className?: string }) {
  if (!meta || meta.ok) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-destructive/40 bg-destructive/10 px-2 py-0 text-[10px] font-medium uppercase tracking-wide text-destructive",
        className,
      )}
    >
      Panel failed
    </Badge>
  );
}

function CategoryCarousel({ categories }: { categories: CategoryRow[] }) {
  const visible = categories.filter((category) => category.category_key !== "__UNMAPPED__");

  if (!visible.length) {
    return <DataPlaceholder />;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {visible.map((category) => (
        <div
          key={category.category_key}
          className="flex min-w-[200px] items-center gap-3 rounded-2xl border border-black/5 bg-card px-4 py-3 shadow-sm"
        >
          <Image
            src={getIcon(category.icon_url ?? undefined)}
            alt={category.display_name}
            width={32}
            height={32}
            sizes="(max-width: 640px) 32px, (max-width: 1024px) 32px, 32px"
            className="h-8 w-8 rounded-lg ring-1 ring-black/5"
          />
          <div className="min-w-0">
            <p className="truncate font-medium tracking-tight">{category.display_name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {fmtUSD0(category.total_sales)} • {fmtPct0(category.share_pct)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  noStore();

  const params = await (searchParams ?? Promise.resolve({} as DashboardSearchParams));
  const from = normalizeParam(params.from) || DEFAULT_FROM;
  const to = normalizeParam(params.to) || DEFAULT_TO;

  const envIssues: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    envIssues.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    envIssues.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  const envWarningMessage = envIssues.length
    ? `Missing environment variables: ${envIssues.join(", ")}`
    : null;
  const envReady = envIssues.length === 0;

  let kpisState: PanelState<OrgKpis>;
  let monthlyState: PanelState<MonthlyPoint[]>;
  let dealersState: PanelState<DealerRow[]>;
  let repsState: PanelState<RepRow[]>;
  let categoriesState: PanelState<CategoryRow[]>;
  let engagementState: PanelState<DealerEngagementRow[]>;

  if (envReady) {
    const panelPromises: [
      Promise<SafeResult<OrgKpis>>,
      Promise<SafeResult<MonthlyPoint[]>>,
      Promise<SafeResult<DealerRow[]>>,
      Promise<SafeResult<RepRow[]>>,
      Promise<SafeResult<CategoryRow[]>>,
      Promise<SafeResult<DealerEngagementRow[]>>,
    ] = [
      getOrgKpisSafe(from, to),
      getOrgMonthlySafe(from, to),
      getTopDealersSafe(from, to, 10, 0),
      getTopRepsSafe(from, to, 10, 0),
      getCategoryTotalsSafe(from, to),
      getDealerEngagementSafe(from, to),
    ];

    const [kpisRes, monthlyRes, dealersRes, repsRes, categoriesRes, engagementRes] =
      await Promise.allSettled(panelPromises);

    kpisState = resolvePanelResult(kpisRes, DEFAULT_KPIS, "sales_org_kpis_v2");
    monthlyState = resolvePanelResult(monthlyRes, [], "sales_org_monthly_v2");
    dealersState = resolvePanelResult(dealersRes, [], "sales_org_top_dealers");
    repsState = resolvePanelResult(repsRes, [], "sales_org_top_reps");
    categoriesState = resolvePanelResult(categoriesRes, [], "sales_category_totals");
    engagementState = resolvePanelResult(
      engagementRes,
      [],
      "sales_org_dealer_engagement_trailing_v3",
    );
  } else {
    const meta = createPanelErrorMeta(envWarningMessage ?? "Supabase credentials missing");
    kpisState = { data: DEFAULT_KPIS, meta };
    monthlyState = { data: [], meta };
    dealersState = { data: [], meta };
    repsState = { data: [], meta };
    categoriesState = { data: [], meta };
    engagementState = { data: [], meta };
  }

  console.log("[dash-panels]", {
    from,
    to,
    kpis: kpisState.meta,
    monthly: monthlyState.meta,
    dealers: dealersState.meta,
    reps: repsState.meta,
    cats: categoriesState.meta,
    engage: engagementState.meta,
  });

  const totalRevenue = kpisState.data.revenue ?? 0;
  const latestEngagement = engagementState.data.at(-1) ?? {
    active_cnt: 0,
    inactive_cnt: 0,
    total_assigned: 0,
    active_pct: 0,
  };

  const filteredCategories = categoriesState.data.filter(
    (category) => category.category_key !== "__UNMAPPED__",
  );
  const sortedCategories = [...filteredCategories].sort((a, b) => b.total_sales - a.total_sales);
  const topProductsTotalPages = Math.max(1, Math.ceil(sortedCategories.length / TOP_PRODUCTS_PAGE_SIZE));
  const topProductsPageParam = parseInt(normalizeParam(params.topProductsPage) ?? "1", 10);
  const currentTopProductsPage = Number.isNaN(topProductsPageParam)
    ? 1
    : Math.min(Math.max(topProductsPageParam, 1), topProductsTotalPages);

  const envBanner = envWarningMessage ? (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      {envWarningMessage}. Dashboard data calls are disabled.
    </div>
  ) : null;

  return (
    <div className="mx-auto max-w-[1200px] space-y-10 px-4 pb-12 sm:px-6 lg:px-8">
      {envBanner}
      <PageHeader
        title="CPF Floors MBIC Overview"
        description="High-level KPIs across sales, marketing, and customer sentiment."
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <KpiCard
          title="Revenue YTD"
          value={fmtUSD0(totalRevenue)}
          delta={{
            value: "—",
            trend: "neutral",
            description: "No Year-over-Year delta • data available from 2025-01-01 to 2025-09-30",
          }}
          icon={TrendingUp}
          statusBadge={<PanelFailureBadge meta={kpisState.meta} />}
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
          statusBadge={<PanelFailureBadge meta={engagementState.meta} />}
        />
        <KpiCard
          title="Growth Rate"
          value="—"
          delta={{ value: "Not enough data", trend: "neutral" }}
          icon={ArrowUpRight}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-2xl border border-black/5 bg-card shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <CardTitle className="mb-1 text-2xl font-semibold tracking-tight">Monthly Revenue Trend</CardTitle>
              <p className="text-sm text-muted-foreground">Real-time reporting from Supabase sales data.</p>
            </div>
            <PanelFailureBadge meta={monthlyState.meta} />
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <MonthlyRevenueTrend data={monthlyState.data} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-black/5 bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-3 p-4 pb-0 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="mb-1 text-2xl font-semibold tracking-tight">Top Products</CardTitle>
                <p className="text-sm text-muted-foreground">Leading categories by revenue share.</p>
              </div>
              <PanelFailureBadge meta={categoriesState.meta} />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <TopProductsGrid
              products={sortedCategories}
              currentPage={currentTopProductsPage}
              pageSize={TOP_PRODUCTS_PAGE_SIZE}
              buildPageHref={(page) => buildHref(params, page)}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl border border-black/5 bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div>
            <CardTitle className="mb-1 text-2xl font-semibold tracking-tight">Category Engagement</CardTitle>
            <p className="text-sm text-muted-foreground">Every active segment this period.</p>
          </div>
          <PanelFailureBadge meta={categoriesState.meta} />
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <CategoryCarousel categories={sortedCategories} />
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border border-black/5 bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <CardTitle className="mb-1 text-2xl font-semibold tracking-tight">Top Dealers by Revenue</CardTitle>
              <p className="text-sm text-muted-foreground">Year-to-date totals with latest monthly averages.</p>
            </div>
            <PanelFailureBadge meta={dealersState.meta} />
          </CardHeader>
          <CardContent className="p-0">
            {dealersState.data.length ? (
              <>
                <Table className="min-w-[640px]">
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="bg-card">
                      <TableHead className="sticky top-0 bg-card">#</TableHead>
                      <TableHead className="sticky top-0 bg-card">Dealer</TableHead>
                      <TableHead className="sticky top-0 bg-card">Rep</TableHead>
                      <TableHead className="sticky top-0 bg-card text-right">Revenue YTD</TableHead>
                      <TableHead className="sticky top-0 bg-card text-right">Monthly Avg</TableHead>
                      <TableHead className="sticky top-0 bg-card text-right">Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dealersState.data.map((dealer, index) => {
                      const revenue = dealer.revenue ?? 0;
                      const share = dealer.share_pct ?? (totalRevenue ? (revenue / totalRevenue) * 100 : 0);
                      return (
                        <TableRow key={`${dealer.dealer_name}-${index}`} className="h-12 odd:bg-muted/30">
                          <TableCell className="text-muted-foreground">#{index + 1}</TableCell>
                          <TableCell className="font-medium">{dealer.dealer_name}</TableCell>
                          <TableCell className="text-muted-foreground">{dealer.rep_initials ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtUSD0(revenue)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {fmtUSD0(dealer.monthly_avg ?? 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct0(share)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <p className="px-4 pb-4 text-right text-xs uppercase tracking-wide text-muted-foreground">
                  Scroll →
                </p>
              </>
            ) : (
              <div className="px-4 pb-4">
                <DataPlaceholder />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-black/5 bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <CardTitle className="mb-1 text-2xl font-semibold tracking-tight">Top Sales Reps by Revenue</CardTitle>
              <p className="text-sm text-muted-foreground">Ranked by year-to-date performance.</p>
            </div>
            <PanelFailureBadge meta={repsState.meta} />
          </CardHeader>
          <CardContent className="p-0">
            {repsState.data.length ? (
              <>
                <Table className="min-w-[720px]">
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="bg-card">
                      <TableHead className="sticky top-0 bg-card">#</TableHead>
                      <TableHead className="sticky top-0 bg-card">Rep</TableHead>
                      <TableHead className="sticky top-0 bg-card text-right">Revenue YTD</TableHead>
                      <TableHead className="sticky top-0 bg-card text-right">Monthly Avg</TableHead>
                      <TableHead className="sticky top-0 bg-card text-right">Active</TableHead>
                      <TableHead className="sticky top-0 bg-card text-right">Total</TableHead>
                      <TableHead className="sticky top-0 bg-card text-right">Active %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repsState.data.map((rep, index) => (
                      <TableRow key={`${rep.rep_id}-${index}`} className="h-12 odd:bg-muted/30">
                        <TableCell className="text-muted-foreground">#{index + 1}</TableCell>
                        <TableCell className="font-medium">{rep.rep_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtUSD0(rep.revenue ?? 0)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {fmtUSD0(rep.monthly_avg ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(rep.active_customers ?? 0)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatNumber(rep.total_customers ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {rep.active_pct == null ? "—" : fmtPct0(rep.active_pct)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="px-4 pb-4 text-right text-xs uppercase tracking-wide text-muted-foreground">
                  Scroll →
                </p>
              </>
            ) : (
              <div className="px-4 pb-4">
                <DataPlaceholder />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl border border-black/5 bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div>
            <CardTitle className="mb-1 text-2xl font-semibold tracking-tight">Dealer Engagement Heatmap</CardTitle>
            <p className="text-sm text-muted-foreground">Trailing monthly activity excluding distribution partners.</p>
          </div>
          <PanelFailureBadge meta={engagementState.meta} />
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <DealerHeatmap data={engagementState.data ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
