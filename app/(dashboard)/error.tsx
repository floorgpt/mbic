"use client";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div>
        <h2 className="text-xl font-semibold">Dashboard failed to load</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message ?? "Unknown error"}
          {error?.digest ? ` (digest ${error.digest})` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow"
      >
        Retry
      </button>
    </div>
  );
}
