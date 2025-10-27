import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function tryServer<T>(promise: Promise<T>, label?: string): Promise<[T | null, Error | null]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    console.error(label ? `Server fetch failed (${label}):` : "Server fetch failed:", error);
    return [null, error as Error];
  }
}

export function getIcon(src?: string): string {
  if (!src || typeof src !== "string" || !src.trim()) {
    return "/icons/fallback.svg";
  }
  return src;
}

export type SafeResult<T> = { data: T; error: Error | null };

export async function tryServerSafe<T>(
  promise: Promise<T>,
  label: string,
  fallback: T,
): Promise<SafeResult<T>> {
  const [data, error] = await tryServer(promise, label);
  if (error) {
    return { data: fallback, error };
  }
  return { data: data as T, error: null };
}
