export const MARKETING_BRANDS = [
  "CPF Floors",
  "CPF Launchpad",
  "Talula Floors",
] as const;

export type MarketingBrand = (typeof MARKETING_BRANDS)[number];

export type MarketingKpi = {
  uniqueVisitors: number;
  sessions: number;
  bounceRate: number;
  leads: number;
  cpl: number;
  dailyBudget: number;
};

export type MarketingTimeseriesPoint = {
  date: string;
  googleAds: {
    spend: number;
    leads: number;
    clicks: number;
  };
  meta: {
    spend: number;
    leads: number;
    clicks: number;
  };
};

export const marketingKpis: Record<MarketingBrand, MarketingKpi> = {
  "CPF Floors": {
    uniqueVisitors: 48250,
    sessions: 61980,
    bounceRate: 36,
    leads: 1240,
    cpl: 48,
    dailyBudget: 950,
  },
  "CPF Launchpad": {
    uniqueVisitors: 28710,
    sessions: 34950,
    bounceRate: 41,
    leads: 860,
    cpl: 39,
    dailyBudget: 780,
  },
  "Talula Floors": {
    uniqueVisitors: 19840,
    sessions: 25590,
    bounceRate: 32,
    leads: 640,
    cpl: 44,
    dailyBudget: 520,
  },
};

export const marketingTimeseries: Record<
  MarketingBrand,
  MarketingTimeseriesPoint[]
> = {
  "CPF Floors": [
    {
      date: "2024-06-01",
      googleAds: { spend: 620, leads: 90, clicks: 1250 },
      meta: { spend: 410, leads: 62, clicks: 980 },
    },
    {
      date: "2024-07-01",
      googleAds: { spend: 680, leads: 112, clicks: 1380 },
      meta: { spend: 430, leads: 74, clicks: 1085 },
    },
    {
      date: "2024-08-01",
      googleAds: { spend: 710, leads: 118, clicks: 1425 },
      meta: { spend: 460, leads: 81, clicks: 1110 },
    },
    {
      date: "2024-09-01",
      googleAds: { spend: 735, leads: 127, clicks: 1515 },
      meta: { spend: 480, leads: 86, clicks: 1172 },
    },
    {
      date: "2024-10-01",
      googleAds: { spend: 752, leads: 134, clicks: 1580 },
      meta: { spend: 505, leads: 94, clicks: 1234 },
    },
  ],
  "CPF Launchpad": [
    {
      date: "2024-06-01",
      googleAds: { spend: 485, leads: 70, clicks: 980 },
      meta: { spend: 360, leads: 54, clicks: 840 },
    },
    {
      date: "2024-07-01",
      googleAds: { spend: 510, leads: 82, clicks: 1065 },
      meta: { spend: 375, leads: 61, clicks: 910 },
    },
    {
      date: "2024-08-01",
      googleAds: { spend: 545, leads: 88, clicks: 1120 },
      meta: { spend: 395, leads: 66, clicks: 945 },
    },
    {
      date: "2024-09-01",
      googleAds: { spend: 570, leads: 94, clicks: 1175 },
      meta: { spend: 415, leads: 72, clicks: 990 },
    },
    {
      date: "2024-10-01",
      googleAds: { spend: 598, leads: 101, clicks: 1240 },
      meta: { spend: 432, leads: 78, clicks: 1025 },
    },
  ],
  "Talula Floors": [
    {
      date: "2024-06-01",
      googleAds: { spend: 360, leads: 48, clicks: 690 },
      meta: { spend: 280, leads: 42, clicks: 620 },
    },
    {
      date: "2024-07-01",
      googleAds: { spend: 385, leads: 53, clicks: 750 },
      meta: { spend: 295, leads: 47, clicks: 660 },
    },
    {
      date: "2024-08-01",
      googleAds: { spend: 402, leads: 57, clicks: 795 },
      meta: { spend: 305, leads: 50, clicks: 690 },
    },
    {
      date: "2024-09-01",
      googleAds: { spend: 418, leads: 60, clicks: 830 },
      meta: { spend: 320, leads: 54, clicks: 725 },
    },
    {
      date: "2024-10-01",
      googleAds: { spend: 436, leads: 64, clicks: 870 },
      meta: { spend: 335, leads: 58, clicks: 760 },
    },
  ],
};

export const MARKETING_COLORS = {
  googleAds: "#2563eb",
  meta: "#22c55e",
};
