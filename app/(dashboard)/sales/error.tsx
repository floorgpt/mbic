"use client";

import { useEffect } from "react";

type SalesErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SalesError({ error, reset }: SalesErrorProps) {
  useEffect(() => {
    console.error("Sales dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">We couldn&apos;t load sales analytics.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Something went wrong while fetching data from Supabase. Please try again, or
          contact support if the issue persists.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:shadow"
      >
        Try again
      </button>
    </div>
  );
}
