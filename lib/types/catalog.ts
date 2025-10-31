export type CatalogFetchMeta = {
  ok?: boolean;
  count?: number;
  err?: string | null;
};

export type CatalogFetchResponse<T = unknown> = {
  ok?: boolean;
  data?: T;
  meta?: CatalogFetchMeta;
  err?: string | null;
};
