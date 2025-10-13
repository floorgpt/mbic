import { notFound } from "next/navigation";
import { Users2 } from "lucide-react";

import { DealerSalesTrend } from "@/components/charts/dealer-sales-trend";
import { RepSalesTrend } from "@/components/charts/rep-sales-trend";
import { DealerSelector } from "@/components/sales/dealer-selector";
import { SalesRepSelector } from "@/components/sales/rep-selector";
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
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/format";
import {
  fetchActiveCustomersByRep,
  fetchDealerBreakdownByRep,
  fetchDealerSalesTrend,
  fetchRepSalesTrend,
  fetchSalesReps,
} from "@/lib/supabase/queries";

const DEFAULT_REP = "Juan Pedro Boscan";

type SearchParamsShape = Record<string, string | string[] | undefined>;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const resolvedSearchParams: SearchParamsShape = (await searchParams) ?? {};

  const reps = await fetchSalesReps();

  if (!reps.length) {
    notFound();
  }

  const rawRep = Array.isArray(resolvedSearchParams.rep)
    ? resolvedSearchParams.rep[0]
    : resolvedSearchParams.rep;
  const selectedRep =
    reps.find(
      (rep) =>
        rep.rep_name.trim().toLowerCase() ===
        (rawRep ?? DEFAULT_REP)?.trim().toLowerCase(),
    )?.rep_name ?? reps[0]?.rep_name;

  const [activeCustomers, breakdown, trend] = await Promise.all([
    fetchActiveCustomersByRep(selectedRep),
    fetchDealerBreakdownByRep(selectedRep),
    fetchRepSalesTrend(selectedRep),
  ]);

  const totalRevenue = breakdown.reduce(
    (acc, dealer) => acc + dealer.invoice_total,
    0,
  );
  const totalInvoices = breakdown.reduce(
    (acc, dealer) => acc + dealer.invoice_count,
    0,
  );

  const dealers = breakdown.map((dealer) => dealer.dealer_name);
  const rawDealer = Array.isArray(resolvedSearchParams.dealer)
    ? resolvedSearchParams.dealer[0]
    : resolvedSearchParams.dealer;
  const selectedDealerName = rawDealer && dealers.includes(rawDealer)
    ? rawDealer
    : dealers[0];

  const selectedDealer = breakdown.find(
    (dealer) => dealer.dealer_name === selectedDealerName,
  );

  const dealerTrend = selectedDealerName
    ? await fetchDealerSalesTrend(selectedRep, selectedDealerName)
    : [];

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
          value={formatNumber(activeCustomers.active_customers)}
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
          value={breakdown[0]?.dealer_name ?? "—"}
          delta={
            breakdown[0]
              ? {
                  value: formatCurrency(breakdown[0].invoice_total),
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
            <RepSalesTrend data={trend} />
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
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dealer</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Avg Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((dealer) => (
                  <TableRow key={dealer.dealer_name}>
                    <TableCell className="font-medium">
                      {dealer.dealer_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(dealer.invoice_count)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(dealer.invoice_total)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {dealer.invoice_count
                        ? formatCurrency(
                            dealer.invoice_total / dealer.invoice_count,
                          )
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              dealers={dealers}
              selected={selectedDealerName}
              className="w-full md:w-64"
            />
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedDealer ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard
                    title="Dealer Revenue"
                    value={formatCurrency(selectedDealer.invoice_total)}
                    delta={{
                      value: `${formatNumber(selectedDealer.invoice_count)} invoices`,
                      trend: "neutral",
                    }}
                  />
                  <KpiCard
                    title="Average Invoice"
                    value={
                      selectedDealer.invoice_count
                        ? formatCurrency(
                            selectedDealer.invoice_total /
                              selectedDealer.invoice_count,
                          )
                        : formatCurrency(0)
                    }
                  />
                  <KpiCard
                    title="Revenue Share"
                    value={formatPercent(
                      (selectedDealer.invoice_total / totalRevenue || 0) * 100,
                    )}
                  />
                  <KpiCard
                    title="Trend Months"
                    value={`${dealerTrend.length}`}
                    delta={{ value: "months tracked", trend: "neutral" }}
                  />
                </div>
                <div className="rounded-2xl border bg-background/70 p-4">
                  {dealerTrend.length ? (
                    <DealerSalesTrend data={dealerTrend} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      We need more data before charting {selectedDealerName}.
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
