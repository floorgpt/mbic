import type { MarketingBrand } from "@/lib/data/marketing";

export type SentimentStory = {
  id: string;
  brand: MarketingBrand;
  summary: string;
  quote: string;
  sentiment: "positive" | "neutral" | "negative";
  keywords: string[];
  channel: string;
  updatedAt: string;
};
