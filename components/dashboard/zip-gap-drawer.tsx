"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useZipGapData } from "@/hooks/use-zip-gap-data";
import { fmtUSD0 } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  TrendingDown,
  Sparkles,
  Store,
  MapPin,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import AI chat components
const ChatSheet = dynamic(
  () => import("@/components/ui/chat-sheet").then((mod) => ({ default: mod.ChatSheet })),
  { ssr: false }
);
const FloatingNudge = dynamic(
  () => import("@/components/ui/floating-nudge").then((mod) => ({ default: mod.FloatingNudge })),
  { ssr: false }
);

type ZipGapDrawerProps = {
  /** Controls whether the drawer is open */
  isOpen: boolean;
  /** Callback when user closes the drawer */
  onClose: () => void;
  /** ZIP code to display gap data for */
  zipCode: string | null;
  /** Date range for context (not used for gap data, but shown in header) */
  dateRange?: { from: string; to: string };
};

export function ZipGapDrawer({ isOpen, onClose, zipCode, dateRange }: ZipGapDrawerProps) {
  const { data, loading, error, totalRevenue, competitorCount, topCompetitor, bigBoxCount } =
    useZipGapData(zipCode);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(true);

  // Seeded Q&A for Gap Analysis AI chat
  const seededQuestions = [
    {
      question: "What's our biggest missed opportunity?",
      answer: topCompetitor
        ? `The biggest competitor in ZIP ${zipCode} is ${topCompetitor.store_name} with an estimated ${fmtUSD0(topCompetitor.est_annual_revenue)} in annual revenue. This represents significant market presence we're missing.`
        : `We don't have competitor data for ZIP ${zipCode} yet. The Edge Function may need to sync this area.`,
    },
    {
      question: "Why don't we have sales here?",
      answer: `ZIP ${zipCode} has ${competitorCount} competitor${competitorCount === 1 ? "" : "s"} with zero sales from our dealers. This could indicate: (1) No dealer coverage in this area, (2) Underperforming dealers not capturing market share, or (3) Strong competitor dominance. Consider targeted dealer recruitment or sales rep assignment to this ZIP.`,
    },
    {
      question: "Which competitors are strongest?",
      answer:
        data.length > 0
          ? `In ZIP ${zipCode}, the top competitors are: ${data
              .slice(0, 3)
              .map((c) => `${c.store_name} (~${fmtUSD0(c.est_annual_revenue)})`)
              .join(", ")}. ${bigBoxCount > 0 ? `There ${bigBoxCount === 1 ? "is" : "are"} ${bigBoxCount} big box store${bigBoxCount === 1 ? "" : "s"} with established flooring departments.` : ""}`
          : "No competitor data available for this ZIP yet.",
    },
    {
      question: "What should we do about this gap?",
      answer: `Based on ${fmtUSD0(totalRevenue)} in estimated market opportunity, here are recommended actions: (1) Assign a sales rep to actively prospect this ZIP, (2) Identify nearby dealers who could expand coverage, (3) Research local building permits and new construction activity, (4) Consider dealer incentives for first sales in this area.`,
    },
  ];

  const suggestions = [
    "What's our biggest missed opportunity?",
    "Why don't we have sales here?",
    "What should we do about this gap?",
  ];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          className="w-full sm:max-w-2xl overflow-y-auto"
          onPointerDownOutside={(e) => {
            // Prevent closing if chat is open
            if (isChatOpen) {
              e.preventDefault();
            }
          }}
        >
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <SheetTitle className="text-xl font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Gap Analysis: ZIP {zipCode}
                </SheetTitle>
                <SheetDescription>
                  Market opportunity with competitor presence but zero sales
                </SheetDescription>
              </div>

              {/* AI Trigger Button */}
              <motion.button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50",
                  "dark:from-indigo-950/50 dark:via-purple-950/50 dark:to-pink-950/50",
                  "transition-all duration-200",
                  isChatOpen && "ring-2 ring-indigo-400/50"
                )}
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Open AI Assistant"
              >
                <Sparkles
                  className={cn(
                    "h-5 w-5",
                    isChatOpen
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-indigo-500 dark:text-indigo-300"
                  )}
                />
              </motion.button>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
                <span className="ml-3 text-sm text-muted-foreground">
                  Loading competitor data...
                </span>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  <strong>Error:</strong> {error}
                </p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && data.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
                <Store className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  No competitor data available for ZIP {zipCode}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Run the sync-market-data Edge Function to populate this area
                </p>
              </div>
            )}

            {/* Data Loaded */}
            {!loading && !error && data.length > 0 && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Total Market Opportunity */}
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                        Missed Revenue
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {fmtUSD0(totalRevenue)}
                    </div>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                      Est. annual market size
                    </p>
                  </div>

                  {/* Competitor Count */}
                  <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Store className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                        Competitors
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {competitorCount}
                    </div>
                    <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5">
                      {bigBoxCount} big box store{bigBoxCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                {/* Competitor Table */}
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Store Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead className="text-right">Est. Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((competitor, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-muted-foreground" />
                              {competitor.store_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                competitor.store_type === "Big Box"
                                  ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                                  : "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
                              )}
                            >
                              {competitor.store_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              {competitor.city}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600 dark:text-red-400">
                            {fmtUSD0(competitor.est_annual_revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Action Items */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    💡 Recommended Actions
                  </h3>
                  <ul className="space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Assign sales rep to actively prospect this ZIP code</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Identify nearby dealers who could expand coverage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Research local building permits and construction activity</span>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Floating Nudge */}
          <AnimatePresence>
            {showNudge && !isChatOpen && !loading && data.length > 0 && (
              <FloatingNudge
                message="💡 Ask me about expansion strategies for this gap"
                onDismiss={() => setShowNudge(false)}
                onClick={() => {
                  setIsChatOpen(true);
                  setShowNudge(false);
                }}
              />
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>

      {/* AI Chat Sheet */}
      <ChatSheet
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        suggestions={suggestions}
        seededQuestions={seededQuestions}
        placeholder="Ask about this gap opportunity..."
        title={`Gap Analysis Assistant`}
      />
    </>
  );
}
