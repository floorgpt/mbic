export default function SalesOpsLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-6 w-96 animate-pulse rounded bg-muted/70" />
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-dashed border-muted bg-muted/40 p-6"
          >
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-6 h-8 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-3 w-20 animate-pulse rounded bg-muted/70" />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-muted bg-muted/30 p-6 xl:col-span-2">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-[280px] animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-muted bg-muted/30 p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-16 w-36 animate-pulse rounded-full bg-muted"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-muted bg-muted/30 p-6 lg:col-span-2">
          <div className="h-5 w-64 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-dashed border-muted bg-muted/40 p-4"
              >
                <div className="h-3 w-32 animate-pulse rounded bg-muted/60" />
                <div className="mt-4 h-7 w-24 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-muted bg-muted/30 p-6">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-4 rounded-2xl border border-dashed border-muted bg-muted/30 p-6"
          >
            <div className="h-5 w-64 animate-pulse rounded bg-muted" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
              Thinking…
            </div>
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          </div>
        ))}
      </section>
    </div>
  );
}
