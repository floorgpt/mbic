import { notFound } from "next/navigation";
import { Users2 } from "lucide-react";

import { DealerSalesTrend } from "@/components/charts/dealer-sales-trend";
import { RepSalesTrend } from "@/components/charts/rep-sales-trend";
import { DealerSelector, type DealerOption } from "@/components/sales/dealer-selector";
import { DealerBreakdownTable } from "@/components/sales/dealer-breakdown-table";
import { SalesRepSelector } from "@/components/sales/rep-selector";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/format";
import { fetchSalesReps } from "@/lib/supabase/queries";
import { fetchRepSalesData } from "@/lib/db/sales";
import { validateLindaFlooring } from "@/lib/db/sales-validation";
import { getDealerMonthly } from "@/lib/mbic-sales";
const DEFAULT_REP = "Juan Pedro Boscan";

type SearchParamsShape = Record<string, string | string[] | undefined>;
type SalesPageProps = {
  searchParams?: SearchParamsShape | Promise<SearchParamsShape>;
};

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const resolvedSearchParams: SearchParamsShape =
    searchParams && typeof (searchParams as Promise<unknown>)?.then === "function"
      ? await (searchParams as Promise<SearchParamsShape>)
      : ((searchParams as SearchParamsShape) ?? {});

  const reps = await fetchSalesReps();

  if (!reps.length) {
    notFound();
  }

  const rawRep = Array.isArray(resolvedSearchParams.rep)
    ? resolvedSearchParams.rep[0]
    : resolvedSearchParams.rep;
  const selectedRepRow =
    reps.find(
      (rep) =>
        rep.rep_name.trim().toLowerCase() ===
        (rawRep ?? DEFAULT_REP)?.trim().toLowerCase(),
    ) ?? reps[0];

  if (!selectedRepRow) {
    notFound();
  }

  const selectedRep = selectedRepRow.rep_name;
  const repId = selectedRepRow.rep_id;

  const salesData = await fetchRepSalesData(repId);

  const totalRevenue = salesData.grandTotal;
  const totalInvoices = salesData.invoiceCount;
  const customersHandled = salesData.uniqueCustomers;

  const dealerOptions: DealerOption[] = salesData.dealers.map((dealer) => ({
    id: dealer.customer_id,
    name: dealer.dealer_name,
  }));

  const rawDealer = Array.isArray(resolvedSearchParams.dealer)
    ? resolvedSearchParams.dealer[0]
    : resolvedSearchParams.dealer;
  const requestedDealerId = rawDealer ? Number(rawDealer) : undefined;

  const selectedDealerId = dealerOptions.some((dealer) => dealer.id === requestedDealerId)
    ? requestedDealerId
    : dealerOptions[0]?.id;

  const selectedDealer = salesData.dealers.find(
    (dealer) => dealer.customer_id === selectedDealerId,
  );

  const repTrend = salesData.monthlyTotals.map((item) => ({
    month: item.month,
    total_sales: item.total,
  }));

  const dealerMonthly = selectedDealer
    ? await getDealerMonthly(repId, selectedDealer.customer_id, salesData.dateRange)
    : [];

  const dealerTrend = dealerMonthly.map((item) => ({
    month: item.month_label,
    total_sales: item.month_revenue,
  }));

  // Validate Linda Flooring totals when viewing Juan Pedro Boscan
  if (selectedRep.trim().toLowerCase() === DEFAULT_REP.toLowerCase()) {
    const lindaMonthly = await getDealerMonthly(repId, 1, salesData.dateRange);
    if (lindaMonthly.length > 0) {
      validateLindaFlooring(lindaMonthly);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Sales"
        title="Sales Performance"
        description="Drill into rep performance powered by Supabase analytics."
        actions={
          <SalesRepSelector
            reps={reps}
            selected={selectedRep}
            className="w-full md:w-72"
          />
        }
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          delta={{
            value: `${formatNumber(totalInvoices)} invoices`,
            trend: "neutral",
          }}
        />
        <KpiCard
          title="Customers Handled"
          value={formatNumber(customersHandled)}
          delta={{
            value: "Unique dealers in the last 12 months",
            trend: "neutral",
          }}
          icon={Users2}
        />
        <KpiCard
          title="Average Invoice"
          value={
            totalInvoices
              ? formatCurrency(totalRevenue / totalInvoices)
              : formatCurrency(0)
          }
        />
        <KpiCard
          title="Top Dealer"
          value={salesData.dealers[0]?.dealer_name ?? "—"}
          delta={
            salesData.dealers[0]
              ? {
                  value: formatCurrency(salesData.dealers[0].revenue),
                  trend: "up",
                }
              : undefined
          }
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none bg-gradient-to-br from-background to-muted/60">
          <CardHeader>
            <CardTitle className="font-montserrat text-xl">
              Monthly Sales Trend
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Invoice totals grouped by month for {selectedRep}.
            </p>
          </CardHeader>
          <CardContent>
            <RepSalesTrend data={repTrend} />
          </CardContent>
        </Card>

        <Card className="border-none bg-background">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-montserrat text-xl">
                Dealer Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Revenue impact per dealer for {selectedRep}.
              </p>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary">
              {formatCurrency(totalRevenue)}
            </Badge>
          </CardHeader>
          <CardContent>
            <DealerBreakdownTable dealers={salesData.dealers} />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-none bg-background">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="font-montserrat text-xl">
                Sales Performance by Dealer
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Drill into individual dealer momentum under {selectedRep}.
              </p>
            </div>
            <DealerSelector
              dealers={dealerOptions}
              selected={selectedDealerId}
              className="w-full md:w-64"
            />
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedDealer ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard
                    title="Dealer Revenue"
                    value={formatCurrency(selectedDealer.revenue)}
                    delta={{
                      value: `${formatNumber(selectedDealer.invoices)} invoices`,
                      trend: "neutral",
                    }}
                  />
                  <KpiCard
                    title="Average Invoice"
                    value={
                      selectedDealer.invoices
                        ? formatCurrency(selectedDealer.average_invoice)
                        : formatCurrency(0)
                    }
                  />
                  <KpiCard
                    title="Revenue Share"
                    value={formatPercent(selectedDealer.revenue_share)}
                  />
                  <KpiCard
                    title="Trend Months"
                    value={`${dealerMonthly.length}`}
                    delta={{ value: "months tracked", trend: "neutral" }}
                  />
                </div>
                <div className="rounded-2xl border bg-background/70 p-4">
                  {dealerTrend.length ? (
                    <DealerSalesTrend data={dealerTrend} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      We need more data before charting {selectedDealer?.dealer_name ?? "this dealer"}.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No dealers are currently assigned to {selectedRep}.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
