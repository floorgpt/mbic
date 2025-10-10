import type { MarketingBrand } from "@/lib/data/marketing";

export type SentimentStory = {
  id: string;
  brand: MarketingBrand;
  summary: string;
  quote: string;
  sentiment: "positive" | "neutral" | "negative";
  keywords: string[];
  channel: "Email" | "Chat" | "Phone" | "Showroom";
  updatedAt: string;
};

export const sentimentStories: SentimentStory[] = [
  {
    id: "cpf-floors-001",
    brand: "CPF Floors",
    summary:
      "Dealer reported that the new Coastal Oak collection is driving 30% more showroom appointments than last quarter.",
    quote:
      "The Coastal Oak boards feel premium. Customers say they love how it hides everyday scuffs without looking fake.",
    sentiment: "positive",
    keywords: ["Coastal Oak", "appointments", "premium finish"],
    channel: "Showroom",
    updatedAt: "2024-10-08T14:32:00Z",
  },
  {
    id: "cpf-launchpad-002",
    brand: "CPF Launchpad",
    summary:
      "Prospect feedback indicates onboarding docs remain confusing despite the latest updates.",
    quote:
      "We still had to call support to complete setup. The guides mix dealer and installer language in one place.",
    sentiment: "neutral",
    keywords: ["onboarding", "support call", "documentation"],
    channel: "Chat",
    updatedAt: "2024-10-07T18:05:00Z",
  },
  {
    id: "talula-floors-003",
    brand: "Talula Floors",
    summary:
      "Interior designer praised Talula's artisanal palette but flagged shipping delays in the Southwest region.",
    quote:
      "Your herringbone pattern photographs beautifully, but timelines slip every time we order for Phoenix installs.",
    sentiment: "negative",
    keywords: ["shipping delay", "Southwest", "herringbone"],
    channel: "Email",
    updatedAt: "2024-10-03T09:45:00Z",
  },
  {
    id: "cpf-floors-004",
    brand: "CPF Floors",
    summary:
      "Homeowner referral cited the in-home visualization tool as the deciding factor for choosing CPF Floors.",
    quote:
      "Seeing the room in 3D sealed it for us. We could compare Walnut Luxe against our kitchen cabinets instantly.",
    sentiment: "positive",
    keywords: ["visualization tool", "referral", "conversion"],
    channel: "Phone",
    updatedAt: "2024-09-28T21:15:00Z",
  },
  {
    id: "cpf-launchpad-005",
    brand: "CPF Launchpad",
    summary:
      "Launchpad partners continue to ask for a shared asset library that includes co-branded social templates.",
    quote:
      "Is there a way to download pre-approved reels? Building everything from scratch keeps us off schedule.",
    sentiment: "neutral",
    keywords: ["asset library", "social templates", "co-branded"],
    channel: "Chat",
    updatedAt: "2024-10-05T16:20:00Z",
  },
  {
    id: "talula-floors-006",
    brand: "Talula Floors",
    summary:
      "Luxury reseller highlighted Talula's sustainability story as a differentiator with eco-conscious buyers.",
    quote:
      "Clients perk up when we talk reclaimed sourcing. More content on the supply chain would help our sales decks.",
    sentiment: "positive",
    keywords: ["sustainability", "eco-conscious", "content request"],
    channel: "Phone",
    updatedAt: "2024-10-06T12:55:00Z",
  },
];
