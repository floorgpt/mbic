const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

export const fmtUSD0 = (value: number) => usdFormatter.format(value ?? 0);
export const fmtPct0 = (value: number) => percentFormatter.format((value ?? 0) / 100);
export const fmtCompact = (value: number) => compactFormatter.format(value ?? 0);
