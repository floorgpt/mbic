import type { Metadata } from "next";
import { FutureSalesTable } from "@/components/ops/future-sales-table";
import { FutureSalesTotals } from "@/components/ops/future-sales-totals";
import { LogisticsSection } from "@/components/ops/logistics-section";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Operations Hub",
};

export default async function OpsPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        kicker="Operations"
        title="Operations Hub"
        description="Manage future sale opportunities, incoming stock inventory, and logistics KPIs."
      />

      {/* Future Sale Opportunities Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-montserrat text-2xl font-semibold tracking-tight">
              Future Sale Opportunities
            </h2>
            <p className="text-sm text-muted-foreground">
              Review and confirm stock for upcoming sales projects.
            </p>
          </div>
        </div>

        {/* Totalization Cards */}
        <FutureSalesTotals />

        {/* Future Sales Table */}
        <FutureSalesTable />
      </section>

      {/* Logistics Dashboard Section */}
      <LogisticsSection />
    </div>
  );
}
