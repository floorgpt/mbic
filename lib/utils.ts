import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function tryServer<T>(promise: Promise<T>): Promise<[T | null, Error | null]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    return [null, error as Error];
  }
}

export function getIcon(src?: string): string {
  if (!src || typeof src !== "string" || !src.trim()) {
    return "/icons/fallback.svg";
  }
  return src;
}

export type PanelMeta = {
  ok: boolean;
  count: number;
  err?: string;
};

export type SafeResult<T> = { data: T; _meta: PanelMeta };

export async function tryServerSafe<T>(
  promise: Promise<T>,
  label: string,
  fallback: T,
): Promise<SafeResult<T>> {
  const [data, error] = await tryServer(promise);
  if (error) {
    console.error(`Server fetch failed (${label}):`, error);
    const fallbackCount = Array.isArray(fallback) ? fallback.length : fallback ? 1 : 0;
    return {
      data: fallback,
      _meta: { ok: false, count: fallbackCount, err: error.message },
    };
  }
  const resolved = data ?? fallback;
  const count = Array.isArray(resolved) ? resolved.length : resolved ? 1 : 0;
  return { data: resolved as T, _meta: { ok: true, count } };
}
