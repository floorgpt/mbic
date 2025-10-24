export default function SalesLoading() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
               
              key={index}
              className="rounded-2xl border border-dashed border-muted bg-muted/40 p-6"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-6 h-7 w-28 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-dashed border-muted bg-muted/30 p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-6 h-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="rounded-2xl border border-dashed border-muted bg-muted/30 p-6">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid grid-cols-2 gap-3">
                <div className="h-4 animate-pulse rounded bg-muted" />
                <div className="h-4 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-muted bg-muted/30 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="h-5 w-52 animate-pulse rounded bg-muted" />
          <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-6 h-32 animate-pulse rounded bg-muted" />
      </section>
    </div>
  );
}
