import { getSupabaseClient } from "@/lib/supabase/client";
import type { SentimentStory } from "@/types/sentiment";

type SentimentStoryRow = {
  external_id: string;
  brand: string;
  summary: string;
  quote: string;
  sentiment: "positive" | "neutral" | "negative";
  keywords: string[] | null;
  channel: string | null;
  updated_at: string;
};

export async function fetchSentimentStories(): Promise<SentimentStory[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("sentiment_stories")
    .select(
      "external_id, brand, summary, quote, sentiment, keywords, channel, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (
    data?.map((row: SentimentStoryRow) => ({
      id: row.external_id,
      brand: row.brand as SentimentStory["brand"],
      summary: row.summary,
      quote: row.quote,
      sentiment: row.sentiment,
      keywords: row.keywords ?? [],
      channel: row.channel ?? "",
      updatedAt: row.updated_at,
    })) ?? []
  );
}
