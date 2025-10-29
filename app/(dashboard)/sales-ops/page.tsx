import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowUpRight, Boxes, Percent, TrendingUp } from "lucide-react";

import { SalesOpsRangePicker } from "@/components/sales-ops/range-picker";
import { EconomicsChart } from "@/components/sales-ops/economics-chart";
import { TopCollections } from "@/components/sales-ops/top-collections";
import { ReportsTimeline } from "@/components/sales-ops/reports-timeline";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
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
import { fmtCompact, fmtPct0, fmtUSD0 } from "@/lib/format";
import {
  getCategoryKpis,
  getCategoryKpisMonthly,
  getCollectionsLeaderboard,
  getCollectionsMonthly,
  getCommConsistency,
  getDealerBounce,
  getFillRate,
  getForecastAccuracy,
  getFutureOppsOpen,
  getImportLeadTime,
  getIncomingStockByCollection,
  getInventoryTurnover,
  getReportsByMonth,
} from "@/lib/mbic-supabase-salesops";
import type {
  CategoryKpiRow,
  CategoryKpiMonthlyRow,
  CollectionLeaderboardRow,
  CollectionMonthlyRow,
  CommConsistencyRow,
  DealerBounceRow,
  FillRateRow,
  ForecastAccuracyRow,
  FutureOpportunityRow,
  ImportLeadTimeRow,
  IncomingStockRow,
  InventoryTurnoverRow,
  ReportsByMonthRow,
} from "@/types/salesops";
import type { PanelMeta, SafeResult } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

type RangePresetId = "ytd" | "qtd" | "mtd" | "custom";

type SalesOpsSearchParams = Record<string, string | string[] | undefined>;

type PanelState<T> = {
  data: T;
  meta: PanelMeta;
};

type RangePreset = {
  id: RangePresetId;
  label: string;
  from: string;
  to: string;
};

type SalesOpsPageProps = {
  searchParams?: Promise<SalesOpsSearchParams>;
};

type MonthlyAggregate = {
  month: string;
  revenue: number;
  profit: number;
  margin_pct: number;
};

type CollectionSummary = {
  collection: string;
  revenue: number;
  sharePct: number;
};

export const metadata: Metadata = {
  title: "Sales Ops Overview",
};

function toISODate(date: Date): string {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function startOfQuarter(date: Date): Date {
  const month = date.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth, 1);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
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
  console.error(`Sales Ops panel rejected (${label}):`, reason);

  return {
    data: fallback,
    meta: createPanelErrorMeta(reason),
  };
}

function sumRevenue(rows: Array<{ gross_revenue: number }>): number {
  return rows.reduce((acc, row) => acc + (row.gross_revenue ?? 0), 0);
}

function sumProfit(rows: Array<{ gross_profit: number }>): number {
  return rows.reduce((acc, row) => acc + (row.gross_profit ?? 0), 0);
}

function aggregateMonthly(rows: CategoryKpiMonthlyRow[]): MonthlyAggregate[] {
  const map = new Map<string, { revenue: number; profit: number }>();
  rows.forEach((row) => {
    const month = row.bucket_month;
    if (!map.has(month)) {
      map.set(month, { revenue: 0, profit: 0 });
    }
    const entry = map.get(month)!;
    entry.revenue += row.gross_revenue ?? 0;
    entry.profit += row.gross_profit ?? 0;
  });

  return Array.from(map.entries())
    .map(([month, { revenue, profit }]) => ({
      month,
      revenue,
      profit,
      margin_pct: revenue > 0 ? (profit / revenue) * 100 : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function calculateMarginDelta(points: MonthlyAggregate[]): number {
  if (points.length < 2) return 0;
  const sorted = [...points].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  return latest.margin_pct - previous.margin_pct;
}

function detectPreset(from: string, to: string, presets: RangePreset[]): RangePresetId {
  const match = presets.find((preset) => preset.id !== "custom" && preset.from === from && preset.to === to);
  return match ? match.id : "custom";
}

function PanelFailureBadge({ meta, className }: { meta?: PanelMeta; className?: string }) {
  if (!meta || meta.ok) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700",
        className,
      )}
    >
      Offline
    </Badge>
  );
}

function ThinkingPlaceholder() {
  return (
    <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
        Thinking…
      </div>
    </div>
  );
}

export default async function SalesOpsPage({ searchParams }: SalesOpsPageProps) {
  noStore();

  const resolvedParams: SalesOpsSearchParams = await (searchParams ?? Promise.resolve({}));
  const todayDate = new Date();
  const ytdFrom = toISODate(new Date(todayDate.getFullYear(), 0, 1));
  const todayIso = toISODate(todayDate);
  const qtdFrom = toISODate(startOfQuarter(todayDate));
  const mtdFrom = toISODate(startOfMonth(todayDate));

  const rawFrom = normalizeParam(resolvedParams.from);
  const rawTo = normalizeParam(resolvedParams.to);
  const requestedRange = normalizeParam(resolvedParams.range) as RangePresetId | undefined;

  let from = rawFrom ?? ytdFrom;
  let to = rawTo ?? todayIso;

  if (from > to) {
    const tmp = from;
    from = to;
    to = tmp;
  }

  const presets: RangePreset[] = [
    { id: "ytd", label: "YTD", from: ytdFrom, to: todayIso },
    { id: "qtd", label: "QTD", from: qtdFrom, to: todayIso },
    { id: "mtd", label: "MTD", from: mtdFrom, to: todayIso },
    { id: "custom", label: "Custom", from, to },
  ];

  const activePreset = requestedRange && presets.some((preset) => preset.id === requestedRange)
    ? requestedRange
    : detectPreset(from, to, presets);

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

  let categoryKpisState: PanelState<CategoryKpiRow[]>;
  let categoryMonthlyState: PanelState<CategoryKpiMonthlyRow[]>;
  let fillRateState: PanelState<FillRateRow[]>;
  let importLeadTimeState: PanelState<ImportLeadTimeRow[]>;
  let forecastAccuracyState: PanelState<ForecastAccuracyRow[]>;
  let inventoryTurnoverState: PanelState<InventoryTurnoverRow[]>;
  let dealerBounceState: PanelState<DealerBounceRow[]>;
  let reportsState: PanelState<ReportsByMonthRow[]>;
  let commConsistencyState: PanelState<CommConsistencyRow[]>;
  let collectionsLeaderboardState: PanelState<CollectionLeaderboardRow[]>;
  let collectionsMonthlyState: PanelState<CollectionMonthlyRow[]>;
  let futureOppsState: PanelState<FutureOpportunityRow[]>;
  let incomingStockState: PanelState<IncomingStockRow[]>;

  if (envReady) {
    const panelPromises = [
      getCategoryKpis(from, to),
      getCategoryKpisMonthly(from, to),
      getFillRate(from, to),
      getImportLeadTime(from, to),
      getForecastAccuracy(from, to),
      getInventoryTurnover(from, to),
      getDealerBounce(from, to),
      getReportsByMonth(from, to),
      getCommConsistency(from, to),
      getCollectionsLeaderboard(from, to),
      getCollectionsMonthly(from, to),
      getFutureOppsOpen(from, to),
      getIncomingStockByCollection(from, to),
    ] as const;

    const [
      categoryKpisRes,
      categoryMonthlyRes,
      fillRateRes,
      importLeadTimeRes,
      forecastAccuracyRes,
      inventoryTurnoverRes,
      dealerBounceRes,
      reportsRes,
      commConsistencyRes,
      collectionsLeaderboardRes,
      collectionsMonthlyRes,
      futureOppsRes,
      incomingStockRes,
    ] = await Promise.allSettled(panelPromises);

    categoryKpisState = resolvePanelResult(categoryKpisRes, [], "sales_ops_category_kpis");
    categoryMonthlyState = resolvePanelResult(categoryMonthlyRes, [], "sales_ops_category_kpis_monthly");
    fillRateState = resolvePanelResult(fillRateRes, [], "sales_ops_fill_rate");
    importLeadTimeState = resolvePanelResult(importLeadTimeRes, [], "sales_ops_import_lead_time");
    forecastAccuracyState = resolvePanelResult(forecastAccuracyRes, [], "sales_ops_forecast_accuracy");
    inventoryTurnoverState = resolvePanelResult(inventoryTurnoverRes, [], "sales_ops_inventory_turnover");
    dealerBounceState = resolvePanelResult(dealerBounceRes, [], "sales_ops_dealer_bounce_rate");
    reportsState = resolvePanelResult(reportsRes, [], "ops_reports_made_by_month");
    commConsistencyState = resolvePanelResult(commConsistencyRes, [], "ops_comm_consistency_index");
    collectionsLeaderboardState = resolvePanelResult(
      collectionsLeaderboardRes,
      [],
      "sales_ops_kpis_by_collection",
    );
    collectionsMonthlyState = resolvePanelResult(
      collectionsMonthlyRes,
      [],
      "sales_ops_kpis_monthly_by_collection",
    );
    futureOppsState = resolvePanelResult(futureOppsRes, [], "list_future_sale_opps_open");
    incomingStockState = resolvePanelResult(incomingStockRes, [], "list_incoming_stock_by_collection");
  } else {
    const meta = createPanelErrorMeta(envWarningMessage ?? "Supabase credentials missing");
    categoryKpisState = { data: [], meta };
    categoryMonthlyState = { data: [], meta };
    fillRateState = { data: [], meta };
    importLeadTimeState = { data: [], meta };
    forecastAccuracyState = { data: [], meta };
    inventoryTurnoverState = { data: [], meta };
    dealerBounceState = { data: [], meta };
    reportsState = { data: [], meta };
    commConsistencyState = { data: [], meta };
    collectionsLeaderboardState = { data: [], meta };
    collectionsMonthlyState = { data: [], meta };
    futureOppsState = { data: [], meta };
    incomingStockState = { data: [], meta };
  }

  console.info("[salesops-panels]", {
    from,
    to,
    categoryKpis: categoryKpisState.meta,
    categoryMonthly: categoryMonthlyState.meta,
    fillRate: fillRateState.meta,
    importLeadTime: importLeadTimeState.meta,
    forecastAccuracy: forecastAccuracyState.meta,
    inventoryTurnover: inventoryTurnoverState.meta,
    dealerBounce: dealerBounceState.meta,
    reports: reportsState.meta,
    commConsistency: commConsistencyState.meta,
    collectionsLeaderboard: collectionsLeaderboardState.meta,
    collectionsMonthly: collectionsMonthlyState.meta,
    futureOpps: futureOppsState.meta,
    incomingStock: incomingStockState.meta,
  });

  const totalRevenue = sumRevenue(categoryKpisState.data);
  const totalProfit = sumProfit(categoryKpisState.data);
  const weightedMarginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const monthlyAggregates = aggregateMonthly(categoryMonthlyState.data);
  const marginDelta = calculateMarginDelta(monthlyAggregates);

  const marginTone = marginDelta > 0 ? "up" : marginDelta < 0 ? "down" : "neutral";
  const marginBadge = (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
        marginDelta > 0 && "bg-emerald-500/10 text-emerald-600",
        marginDelta < 0 && "bg-rose-500/10 text-rose-600",
      )}
    >
      {marginDelta > 0 ? "↑" : marginDelta < 0 ? "↓" : "—"}{" "}
      {Math.abs(marginDelta).toFixed(1)} pts vs last month
    </Badge>
  );

  const inventoryTurnover = inventoryTurnoverState.data[0]?.itr ?? 0;
  const fillRate = fillRateState.data[0]?.fill_rate ?? 0;
  const forecastAccuracy = forecastAccuracyState.data[0]?.accuracy_pct ?? 0;
  const leadTimeDays = importLeadTimeState.data[0]?.avg_days ?? 0;
  const dealerBounce = dealerBounceState.data[0]?.bounce_pct ?? 0;
  const commConsistency = commConsistencyState.data[0]?.consistency_pct ?? 0;

  const topCollectionsRaw = [...collectionsLeaderboardState.data].sort(
    (a, b) => (b.gross_revenue ?? 0) - (a.gross_revenue ?? 0),
  );
  const collectionsTotalRevenue = topCollectionsRaw.reduce(
    (acc, row) => acc + (row.gross_revenue ?? 0),
    0,
  );
  const topCollections: CollectionSummary[] = topCollectionsRaw.slice(0, 5).map((row) => ({
    collection: row.collection,
    revenue: row.gross_revenue ?? 0,
    sharePct:
      collectionsTotalRevenue > 0
        ? ((row.gross_revenue ?? 0) / collectionsTotalRevenue) * 100
        : 0,
  }));

  const economicsChartData = monthlyAggregates.map((point) => ({
    month: point.month,
    revenue: point.revenue,
    margin_pct: point.margin_pct,
  }));

  const reportsData = reportsState.data.map((row) => ({
    month: row.report_month,
    count: row.count ?? 0,
  }));

  const futureOpps = futureOppsState.data.sort((a, b) => {
    const dateA = a.expected_close_date ?? "";
    const dateB = b.expected_close_date ?? "";
    return dateA.localeCompare(dateB);
  });

  const incomingStock = incomingStockState.data.sort((a, b) => {
    const dateA = a.eta_date ?? "";
    const dateB = b.eta_date ?? "";
    return dateA.localeCompare(dateB);
  });

  const envBanner = envWarningMessage ? (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      {envWarningMessage}. Sales Ops data calls are disabled.
    </div>
  ) : null;

  return (
    <div className="space-y-10">
      {envBanner}
      <PageHeader
        kicker="Sales Ops"
        title="Sales & Operations Performance"
        description="Measure Sales+Ops alignment with real-time KPIs and actionable stock signals."
        actions={
          <SalesOpsRangePicker
            presets={presets}
            activePreset={activePreset}
            from={from}
            to={to}
          />
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <KpiCard
          title="Gross Revenue"
          value={fmtUSD0(totalRevenue)}
          subtitle="YTD"
          icon={TrendingUp}
          statusBadge={<PanelFailureBadge meta={categoryKpisState.meta} />}
        />
        <KpiCard
          title="Gross Margin %"
          value={fmtPct0(weightedMarginPct)}
          subtitle="Weighted across categories"
          tone={marginTone}
          icon={Percent}
          statusBadge={
            <div className="flex items-center gap-2">
              <PanelFailureBadge meta={categoryMonthlyState.meta} />
              {marginBadge}
            </div>
          }
        />
        <KpiCard
          title="Inventory Turnover"
          value={inventoryTurnover.toFixed(1)}
          subtitle={`${leadTimeDays.toFixed(1)} day avg lead time`}
          helper="Formula: COGS / Avg Inventory"
          icon={Boxes}
          statusBadge={<PanelFailureBadge meta={inventoryTurnoverState.meta} />}
        />
        <KpiCard
          title="Fill Rate"
          value={fmtPct0(fillRate)}
          subtitle="Average fulfillment performance"
          icon={ArrowUpRight}
          statusBadge={<PanelFailureBadge meta={fillRateState.meta} />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="flex flex-col rounded-2xl border border-black/5 bg-card shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight">Revenue vs Gross Margin</CardTitle>
              <p className="text-sm text-muted-foreground">Monthly roll-up across categories.</p>
            </div>
            <PanelFailureBadge meta={categoryMonthlyState.meta} />
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {categoryMonthlyState.meta.ok ? (
              <EconomicsChart data={economicsChartData} />
            ) : (
              <ThinkingPlaceholder />
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col rounded-2xl border border-black/5 bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-2 p-4 pb-0 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Top Collections
              </CardTitle>
              <PanelFailureBadge meta={collectionsLeaderboardState.meta} />
            </div>
            <p className="text-sm text-muted-foreground">Click a collection to drill into dealer performance.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {collectionsLeaderboardState.meta.ok ? (
              <TopCollections
                collections={topCollections}
                from={from}
                to={to}
                meta={collectionsLeaderboardState.meta}
              />
            ) : (
              <ThinkingPlaceholder />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border border-black/5 bg-card shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 p-4 pb-0 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Sales + Ops Alignment KPIs
              </CardTitle>
              <PanelFailureBadge meta={forecastAccuracyState.meta} />
            </div>
            <p className="text-sm text-muted-foreground">
              Forecast accuracy, lead times, bounce rate, and comms consistency for the selected range.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            <MetricTile
              label="Forecast Accuracy"
              value={fmtPct0(forecastAccuracy)}
              meta={forecastAccuracyState.meta}
            />
            <MetricTile
              label="Import Lead Time"
              value={`${leadTimeDays.toFixed(1)} days`}
              meta={importLeadTimeState.meta}
            />
            <MetricTile
              label="Dealer Bounce Rate"
              value={fmtPct0(dealerBounce)}
              meta={dealerBounceState.meta}
            />
            <MetricTile
              label="Comm Consistency"
              value={fmtPct0(commConsistency)}
              meta={commConsistencyState.meta}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-black/5 bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-2 p-4 pb-0 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl font-semibold tracking-tight">Ops Reports Timeline</CardTitle>
              <PanelFailureBadge meta={reportsState.meta} />
            </div>
            <p className="text-sm text-muted-foreground">
              Monthly count of reports submitted by the Ops team.
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {reportsState.meta.ok ? <ReportsTimeline data={reportsData} /> : <ThinkingPlaceholder />}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border border-black/5 bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-2 p-4 pb-0 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Future Sale Opportunities (Unconfirmed)
              </CardTitle>
              <PanelFailureBadge meta={futureOppsState.meta} />
            </div>
            <p className="text-sm text-muted-foreground">
              Projects with pending stock confirmation. Coordinate with Ops to reserve inventory.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {futureOppsState.meta.ok ? (
              futureOpps.length ? (
                <div className="rounded-xl border border-muted/60">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Dealer</TableHead>
                        <TableHead>Expected SKU</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Close Date</TableHead>
                        <TableHead className="text-right">Rep</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {futureOpps.map((row) => (
                        <TableRow key={`${row.project_name}-${row.expected_sku}-${row.dealer}`}>
                          <TableCell className="font-medium">{row.project_name}</TableCell>
                          <TableCell>{row.dealer}</TableCell>
                          <TableCell>{row.expected_sku}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtCompact(row.expected_qty)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.expected_close_date ?? "TBD"}
                          </TableCell>
                          <TableCell className="text-right">{row.rep}</TableCell>
                          <TableCell className="text-right">
                            <button
                              type="button"
                              className="cursor-not-allowed rounded-full border border-dashed border-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                              disabled
                              title="Ops workflow coming"
                            >
                              Check stock
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
                  No future opportunities without stock confirmation for this range.
                </div>
              )
            ) : (
              <ThinkingPlaceholder />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-black/5 bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-2 p-4 pb-0 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Incoming Stock by Collection
              </CardTitle>
              <PanelFailureBadge meta={incomingStockState.meta} />
            </div>
            <p className="text-sm text-muted-foreground">
              Upcoming inventory arrivals mapped to collections.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {incomingStockState.meta.ok ? (
              incomingStock.length ? (
                <div className="rounded-xl border border-muted/60">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Collection</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">ETA Date</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomingStock.map((row, index) => (
                        <TableRow key={`${row.collection}-${row.sku}-${index}`}>
                          <TableCell className="font-medium">{row.collection}</TableCell>
                          <TableCell>{row.sku}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtCompact(row.qty)}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.eta_date ?? "TBD"}</TableCell>
                          <TableCell className="text-right">
                            {row.received_at ? (
                              <Badge className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                                Arrived
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                                Inbound
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
                  No inbound purchase orders for this range.
                </div>
              )
            ) : (
              <ThinkingPlaceholder />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricTile({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: PanelMeta;
}) {
  return (
    <div className="rounded-xl border border-muted/40 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <PanelFailureBadge meta={meta} />
      </div>
      <p className="font-montserrat text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
