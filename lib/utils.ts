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
