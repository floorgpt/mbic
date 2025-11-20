"use client";

import { useState, useEffect } from "react";
import { getZipOpportunityDetailsSafe } from "@/lib/mbic-supabase";
import type { CompetitorRow } from "@/lib/mbic-supabase";

/**
 * Custom hook for fetching and managing Gap Analysis data for a specific ZIP code
 *
 * @param zipCode - The ZIP code to fetch competitor data for (null to skip fetching)
 * @returns Object containing competitor data, loading state, error, and computed metrics
 *
 * @example
 * ```tsx
 * const { data, loading, error, totalRevenue, competitorCount } = useZipGapData("33166");
 *
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage message={error} />;
 *
 * return (
 *   <div>
 *     <h2>Total Market Opportunity: {fmtUSD0(totalRevenue)}</h2>
 *     <p>{competitorCount} competitors in this ZIP</p>
 *     <CompetitorTable data={data} />
 *   </div>
 * );
 * ```
 */
export function useZipGapData(zipCode: string | null) {
  const [data, setData] = useState<CompetitorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset if no ZIP code
    if (!zipCode) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getZipOpportunityDetailsSafe(zipCode);

        if (result._meta.error) {
          setError(result._meta.error);
          setData([]);
        } else {
          setData(result.data);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch gap data";
        setError(errorMessage);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [zipCode]);

  // Computed metrics
  const totalRevenue = data.reduce((sum, row) => sum + row.est_annual_revenue, 0);
  const competitorCount = data.length;

  // Get top competitor (highest revenue)
  const topCompetitor = data.length > 0 ? data[0] : null;

  // Get breakdown by store type
  const bigBoxCount = data.filter((c) => c.store_type === "Big Box").length;
  const specializedCount = data.filter((c) => c.store_type === "Specialized").length;

  return {
    /** Array of competitor stores, sorted by revenue DESC */
    data,
    /** Loading state (true while fetching) */
    loading,
    /** Error message (null if no error) */
    error,
    /** Total estimated annual revenue of all competitors in this ZIP */
    totalRevenue,
    /** Number of competitor stores in this ZIP */
    competitorCount,
    /** Top competitor by revenue (null if no data) */
    topCompetitor,
    /** Number of Big Box stores */
    bigBoxCount,
    /** Number of Specialized stores */
    specializedCount,
  };
}
