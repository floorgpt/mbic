import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowUpRight, TrendingUp, Users } from "lucide-react";

// import { DealerHeatmap } from "@/components/dashboard/dealer-heatmap"; // Hidden - redirects to Dealer & Sales Pulse
import { DealerSalesPulse } from "@/components/dashboard/dealer-sales-pulse";
import { FloridaZipSalesMap } from "@/components/dashboard/florida-zip-sales-map";
import { MonthlyRevenueTrend } from "@/components/dashboard/monthly-revenue-trend";
import { TopDealersTable } from "@/components/dashboard/top-dealers-table";
import { TopRepsTable } from "@/components/dashboard/top-reps-table";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopCollections } from "@/components/sales-ops/top-collections-enhanced";
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
  getFillRateSafe,
  getFloridaZipSalesSafe,
  getOrgGrossProfitSafe,
  getOrgKpisSafe,
  getOrgMonthlySafe,
  getTopCollectionsSafe,
  getTopDealersSafe,
  getTopRepsSafe,
  type CategoryRow,
  type DealerRow,
  type DealerEngagementRow,
  type FillRate,
  type GrossProfit,
  type TopCollectionRow,
  type RepRow,
  type OrgKpis,
  type MonthlyPoint,
  type ZipSalesRow,
} from "@/lib/mbic-supabase";
import { fmtPct0, fmtUSD0, fmtUSDCompact } from "@/lib/format";
import { formatNumber } from "@/lib/utils/format";
import { cn, getIcon, type PanelMeta, type SafeResult } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const DEFAULT_FROM = "2025-01-01";
const DEFAULT_TO = "2025-10-01";
const TOP_COLLECTIONS_PAGE_SIZE = 5;
const DEFAULT_KPIS: OrgKpis = {
  revenue: 0,
  unique_dealers: 0,
  avg_invoice: 0,
  top_dealer: null,
  top_dealer_revenue: 0,
};
const DEFAULT_GROSS_PROFIT = { amount: 0, margin_pct: 0 } satisfies GrossProfit;
const DEFAULT_FILL_RATE = { pct: 0 } satisfies FillRate;

type DashboardSearchParams = Record<string, string | string[] | undefined>;

type DashboardPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

type PanelState<T> = {
  data: T;
  meta: PanelMeta;
};

function buildPaginationHref(params: DashboardSearchParams, key: string, targetPage: number) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([paramKey, value]) => {
    if (!value || paramKey === key) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(paramKey, entry));
    } else {
      query.set(paramKey, value);
    }
  });
  query.set(key, String(targetPage));
  return `?${query.toString()}`;
}

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
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
    <div className="flex h-full max-h-[600px] flex-col gap-3 overflow-y-auto pb-2 pr-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
      {visible.map((category) => (
        <div
          key={category.category_key}
          className="flex items-center gap-3 rounded-2xl border border-black/5 bg-card px-4 py-3 shadow-sm"
        >
          <Image
            src={getIcon(category.icon_url ?? undefined)}
            alt={category.display_name}
            width={32}
            height={32}
            sizes="(max-width: 640px) 32px, (max-width: 1024px) 32px, 32px"
            className="h-8 w-8 flex-shrink-0 rounded-lg ring-1 ring-black/5"
          />
          <div className="min-w-0 flex-1">
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


function toPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return value;
  return value * 100;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  noStore();

  const params = await (searchParams ?? Promise.resolve({} as DashboardSearchParams));
  const from = normalizeParam(params.from) || DEFAULT_FROM;
  const to = normalizeParam(params.to) || DEFAULT_TO;
  const collectionsPage = parseInt(normalizeParam(params.collectionsPage) ?? "1", 10);

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
  let grossProfitState: PanelState<GrossProfit>;
  let fillRateState: PanelState<FillRate>;
  let monthlyState: PanelState<MonthlyPoint[]>;
  let dealersState: PanelState<DealerRow[]>;
  let repsState: PanelState<RepRow[]>;
  let categoriesState: PanelState<CategoryRow[]>;
  let collectionsState: PanelState<TopCollectionRow[]>;
  let engagementState: PanelState<DealerEngagementRow[]>;
  let zipSalesState: PanelState<ZipSalesRow[]>;

  if (envReady) {
    const panelPromises = [
      getOrgKpisSafe(from, to),
      getOrgGrossProfitSafe(from, to),
      getFillRateSafe(from, to),
      getOrgMonthlySafe(from, to),
      getTopDealersSafe(from, to, 10, 0),
      getTopRepsSafe(from, to, 10, 0),
      getCategoryTotalsSafe(from, to),
      getTopCollectionsSafe(from, to),
      getDealerEngagementSafe(from, to),
      getFloridaZipSalesSafe(from, to),
    ] as const;

    const [
      kpisRes,
      grossProfitRes,
      fillRateRes,
      monthlyRes,
      dealersRes,
      repsRes,
      categoriesRes,
      collectionsRes,
      engagementRes,
      zipSalesRes,
    ] = await Promise.allSettled(panelPromises);

    kpisState = resolvePanelResult(kpisRes, DEFAULT_KPIS, "sales_org_kpis_v2");
    grossProfitState = resolvePanelResult(grossProfitRes, DEFAULT_GROSS_PROFIT, "sales_org_gross_profit_v1");
    fillRateState = resolvePanelResult(fillRateRes, DEFAULT_FILL_RATE, "sales_org_fill_rate_v1");
    monthlyState = resolvePanelResult(monthlyRes, [], "sales_org_monthly_v2");
    dealersState = resolvePanelResult(dealersRes, [], "sales_org_top_dealers");
    repsState = resolvePanelResult(repsRes, [], "sales_org_top_reps");
    categoriesState = resolvePanelResult(categoriesRes, [], "sales_category_totals");
    collectionsState = resolvePanelResult(collectionsRes, [], "sales_org_top_collections");
    engagementState = resolvePanelResult(
      engagementRes,
      [],
      "sales_org_dealer_engagement_trailing_v3",
    );
    zipSalesState = resolvePanelResult(zipSalesRes, [], "sales_by_zip_fl");
  } else {
    const meta = createPanelErrorMeta(envWarningMessage ?? "Supabase credentials missing");
    kpisState = { data: DEFAULT_KPIS, meta };
    grossProfitState = { data: DEFAULT_GROSS_PROFIT, meta };
    fillRateState = { data: DEFAULT_FILL_RATE, meta };
    monthlyState = { data: [], meta };
    dealersState = { data: [], meta };
    repsState = { data: [], meta };
    categoriesState = { data: [], meta };
    collectionsState = { data: [], meta };
    engagementState = { data: [], meta };
    zipSalesState = { data: [], meta };
  }

  console.log("[dash-panels]", {
    from,
    to,
    kpis: kpisState.meta,
    grossProfit: grossProfitState.meta,
    fillRate: fillRateState.meta,
    monthly: monthlyState.meta,
    dealers: dealersState.meta,
    reps: repsState.meta,
    cats: categoriesState.meta,
    collections: collectionsState.meta,
    engage: engagementState.meta,
    zipSales: zipSalesState.meta,
  });

  console.log("[dash-zip-debug]", {
    zipDataLength: zipSalesState.data.length,
    sampleZips: zipSalesState.data.slice(0, 3),
  });

  const totalRevenue = kpisState.data.revenue ?? 0;
  const grossProfit = grossProfitState.data ?? DEFAULT_GROSS_PROFIT;
  const grossMarginPct = toPercent(grossProfit.margin_pct ?? 0);
  const fillRatePct = toPercent(fillRateState.data.pct ?? 0);

  // Get the latest engagement data, skipping any months with zero active dealers
  const validEngagement = engagementState.data.filter((row) => row.active_cnt > 0 || row.active_pct > 0);
  const latestEngagement = validEngagement.length > 0
    ? validEngagement[validEngagement.length - 1]
    : {
        active_cnt: 0,
        inactive_cnt: 0,
        total_assigned: 0,
        active_pct: 0,
        month: "",
      };

  const filteredCategories = categoriesState.data.filter(
    (category) => category.category_key !== "__UNMAPPED__",
  );
  const sortedCategories = [...filteredCategories].sort((a, b) => b.total_sales - a.total_sales);
  const sortedCollections = [...collectionsState.data].sort(
    (a, b) => (b.lifetime_sales ?? 0) - (a.lifetime_sales ?? 0),
  );

  // Transform collections data for enhanced TopCollections component
  const collectionsTotalRevenue = sortedCollections.reduce(
    (acc, row) => acc + (row.lifetime_sales ?? 0),
    0,
  );
  const allCollectionsData = sortedCollections.map((row) => ({
    collection: row.collection_name,
    revenue: row.lifetime_sales ?? 0,
    sharePct:
      collectionsTotalRevenue > 0
        ? ((row.lifetime_sales ?? 0) / collectionsTotalRevenue) * 100
        : 0,
  }));

  // Paginate collections (5 per page)
  const totalCollectionsPages = Math.ceil(allCollectionsData.length / TOP_COLLECTIONS_PAGE_SIZE);
  const safeCollectionsPage = Math.max(1, Math.min(collectionsPage, totalCollectionsPages || 1));
  const startIdx = (safeCollectionsPage - 1) * TOP_COLLECTIONS_PAGE_SIZE;
  const topCollectionsData = allCollectionsData.slice(startIdx, startIdx + TOP_COLLECTIONS_PAGE_SIZE);
  const ytdTotal = monthlyState.data.reduce((sum, row) => sum + (row.total ?? 0), 0);

  const grossRevenueSubtitle = `— • No Year-over-Year delta • data available from ${from} to ${to}`;
  const grossProfitValue = grossProfitState.meta.ok ? fmtPct0(grossMarginPct) : "0 %";
  const grossProfitSubtitle = grossProfitState.meta.ok
    ? `${fmtUSD0(grossProfit.amount)} gross profit`
    : "Data available soon";
  const activeDealersValue = formatNumber(kpisState.data.unique_dealers ?? 0);
  const calculatedActivePct = latestEngagement.total_assigned > 0
    ? (latestEngagement.active_cnt / latestEngagement.total_assigned) * 100
    : 0;
  const activeDealersSubtitle = engagementState.meta.ok
    ? `${formatNumber(latestEngagement.total_assigned ?? 0)} total assigned • ${fmtPct0(calculatedActivePct)} active`
    : "Data available soon";
  const fillRateValue = fillRateState.meta.ok ? fmtPct0(fillRatePct) : "— %";
  const fillRateSubtitle = fillRateState.meta.ok ? "Average order fill rate" : "Data available soon";
  const activeDealersMeta =
    kpisState.meta.ok && engagementState.meta.ok
      ? engagementState.meta
      : createPanelErrorMeta(engagementState.meta.err ?? kpisState.meta.err ?? "Active dealers unavailable");

  const envBanner = envWarningMessage ? (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      {envWarningMessage}. Dashboard data calls are disabled.
    </div>
  ) : null;

  return (
    <div className="space-y-10">
      {envBanner}
      <PageHeader
        title="CPF Floors MBIC Overview"
        description="High-level KPIs across sales, marketing, and customer sentiment."
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <KpiCard
          title="Gross Revenue"
          value={fmtUSDCompact(totalRevenue)}
          subtitle={grossRevenueSubtitle}
          icon={TrendingUp}
          statusBadge={<PanelFailureBadge meta={kpisState.meta} />}
        />
        <KpiCard
          title="Gross Profit"
          value={grossProfitValue}
          subtitle={grossProfitSubtitle}
          statusBadge={<PanelFailureBadge meta={grossProfitState.meta} />}
        />
        <KpiCard
          title="Active Dealers"
          value={activeDealersValue}
          subtitle={activeDealersSubtitle}
          icon={Users}
          statusBadge={<PanelFailureBadge meta={activeDealersMeta} />}
        />
        <KpiCard
          title="Fill Rate"
          value={fillRateValue}
          subtitle={fillRateSubtitle}
          icon={ArrowUpRight}
          statusBadge={<PanelFailureBadge meta={fillRateState.meta} />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="flex h-full flex-col rounded-2xl border border-black/5 bg-card shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <CardTitle className="mb-1 text-2xl font-semibold tracking-tight">Monthly Revenue Trend</CardTitle>
              <p className="text-sm text-muted-foreground">Real-time reporting from Supabase sales data.</p>
            </div>
            <PanelFailureBadge meta={monthlyState.meta} />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Year to date</p>
              <p className="font-montserrat text-lg font-semibold tabular-nums sm:text-xl">{fmtUSD0(ytdTotal)}</p>
            </div>
            <div className="flex-1">
              <MonthlyRevenueTrend data={monthlyState.data} />
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col rounded-2xl border border-black/5 bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-3 p-4 pb-0 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="mb-1 text-2xl font-semibold tracking-tight">Top Collections</CardTitle>
                <p className="text-sm text-muted-foreground">Click a collection to drill into dealer performance.</p>
              </div>
              <PanelFailureBadge meta={collectionsState.meta} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
            <TopCollections
              collections={topCollectionsData}
              from={from}
              to={to}
              meta={collectionsState.meta}
            />
            {totalCollectionsPages > 1 && (
              <div className="flex items-center justify-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                {safeCollectionsPage > 1 ? (
                  <Link
                    href={buildPaginationHref(params, "collectionsPage", safeCollectionsPage - 1)}
                    className="rounded-md border border-muted bg-background px-3 py-1.5 transition hover:bg-muted/60"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="rounded-md border border-transparent bg-muted/40 px-3 py-1.5 text-muted-foreground/50">
                    ← Previous
                  </span>
                )}
                <span className="px-2 font-medium">
                  Page {safeCollectionsPage} of {totalCollectionsPages}
                </span>
                {safeCollectionsPage < totalCollectionsPages ? (
                  <Link
                    href={buildPaginationHref(params, "collectionsPage", safeCollectionsPage + 1)}
                    className="rounded-md border border-muted bg-background px-3 py-1.5 transition hover:bg-muted/60"
                  >
                    Next →
                  </Link>
                ) : (
                  <span className="rounded-md border border-transparent bg-muted/40 px-3 py-1.5 text-muted-foreground/50">
                    Next →
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-2xl border border-black/5 bg-card shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <CardTitle className="mb-1 text-2xl font-semibold tracking-tight">Florida Sales by ZIP Code</CardTitle>
              <p className="text-sm text-muted-foreground">Year-to-date revenue distribution across Florida ZIP codes.</p>
            </div>
            <PanelFailureBadge meta={zipSalesState.meta} />
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <FloridaZipSalesMap
              data={zipSalesState.data}
              dateRange={{ from, to }}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-black/5 bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <CardTitle className="mb-1 text-2xl font-semibold tracking-tight">Category Engagement</CardTitle>
              <p className="text-sm text-muted-foreground">Every active segment this period.</p>
            </div>
            <PanelFailureBadge meta={categoriesState.meta} />
          </CardHeader>
          <CardContent className="flex h-full flex-1 flex-col p-4 sm:p-6">
            <CategoryCarousel categories={sortedCategories} />
          </CardContent>
        </Card>
      </section>

      {/* Dealer Engagement Heatmap - Hidden, use Dealer & Sales Pulse instead */}
      {/*
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
      */}

      <DealerSalesPulse />

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
              <TopDealersTable dealers={dealersState.data} totalRevenue={totalRevenue} />
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
              <TopRepsTable reps={repsState.data} />
            ) : (
              <div className="px-4 pb-4">
                <DataPlaceholder />
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
