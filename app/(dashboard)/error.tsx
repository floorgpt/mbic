"use client";

import { useEffect } from "react";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("Dashboard render error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
      <h2 className="text-xl font-semibold">Dashboard failed to load</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
        <br />
        Digest: {error.digest ?? "n/a"}
      </p>
      <button
        onClick={() => reset()}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
      >
        Retry
      </button>
    </div>
  );
}
