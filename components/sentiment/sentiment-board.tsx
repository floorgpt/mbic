"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MARKETING_BRANDS, type MarketingBrand } from "@/lib/data/marketing";
import { sentimentStories } from "@/lib/data/sentiment";
import { cn } from "@/lib/utils";

type FilterValue = "all" | MarketingBrand;

export function SentimentBoard() {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<FilterValue>("all");

  const stories = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sentimentStories.filter((story) => {
      const matchesBrand = filter === "all" || story.brand === filter;
      const matchesQuery =
        !normalizedQuery ||
        story.summary.toLowerCase().includes(normalizedQuery) ||
        story.quote.toLowerCase().includes(normalizedQuery) ||
        story.keywords.some((keyword) =>
          keyword.toLowerCase().includes(normalizedQuery),
        );
      return matchesBrand && matchesQuery;
    });
  }, [filter, query]);

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Customer Sentiment"
        title="Voice of Customer"
        description="Summaries from Retell AI chats and dealer touchpoints."
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by keyword, quote, or summary"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as FilterValue)}
          className="md:self-end"
        >
          <TabsList className="flex flex-wrap justify-start gap-1 bg-muted/60">
            <TabsTrigger value="all">All</TabsTrigger>
            {MARKETING_BRANDS.map((brand) => (
              <TabsTrigger key={brand} value={brand}>
                {brand}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {stories.map((story) => (
          <Card
            key={story.id}
            className="border border-transparent bg-gradient-to-br from-background to-muted/50 transition hover:border-primary/40"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <Badge className="bg-primary/10 text-primary" variant="secondary">
                  {story.brand}
                </Badge>
                <CardTitle className="mt-2 font-montserrat text-lg">
                  {story.summary}
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "border-transparent text-xs uppercase tracking-wide",
                  story.sentiment === "positive" && "bg-emerald-500/15 text-emerald-600",
                  story.sentiment === "neutral" && "bg-muted text-muted-foreground",
                  story.sentiment === "negative" && "bg-rose-500/15 text-rose-600",
                )}
              >
                {story.sentiment}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <blockquote className="rounded-lg border-l-4 border-primary/40 bg-background/80 p-4 text-sm italic text-muted-foreground">
                “{story.quote}”
              </blockquote>
              <div className="flex flex-wrap gap-2">
                {story.keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    #{keyword}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">Source:</span> {story.channel}
                </span>
                <span>
                  {new Date(story.updatedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {stories.length === 0 ? (
          <p className="col-span-full rounded-lg border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            No stories match your filters yet. Try adjusting the brand or search term.
          </p>
        ) : null}
      </section>
    </div>
  );
}
