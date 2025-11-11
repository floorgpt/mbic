const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usd2Formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

const percentDecimalFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

export const fmtUSD0 = (value: number) => usdFormatter.format(value ?? 0);
export const fmtUSD2 = (value: number) => usd2Formatter.format(value ?? 0);
export const fmtUSDCompact = (value: number) => usdCompactFormatter.format(value ?? 0);
export const fmtPct0 = (value: number) => percentFormatter.format((value ?? 0) / 100);
export const fmtPct1 = (value: number) => percentDecimalFormatter.format((value ?? 0) / 100);
export const fmtCompact = (value: number) => compactFormatter.format(value ?? 0);
