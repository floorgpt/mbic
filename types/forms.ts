export type SalesRepOption = {
  id: number;
  name: string;
};

export type DealerOption = {
  id: number;
  name: string;
  repId: number | null;
};

export type CategoryOption = {
  key: string;
  name: string;
  sortOrder: number | null;
};

export type CollectionOption = {
  key: string;
  label: string | null;
};

export type ColorOption = {
  value: string;
  label: string;
};

export type LossReason = "no_stock" | "price" | "competitor" | "cancelled" | "other";

export type LossOpportunityPayload = {
  repId: number;
  dealerId: number;
  categoryKey: string | null;
  collectionKey: string | null;
  colorName: string | null;
  requestedQty: number;
  targetPrice: number;
  potentialAmount: number;
  reason: LossReason;
  notes?: string | null;
  expectedSku?: string | null;
};

export type FormsWebhookMode = "test" | "prod";

export type FormsWebhookUrls = {
  test: string;
  prod: string;
};

export type FormsWebhookSettings = {
  mode: FormsWebhookMode;
  urls: FormsWebhookUrls;
};
