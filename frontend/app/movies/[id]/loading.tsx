export default function Loading() {
  return (
    <main className="page-shell py-10 md:py-14">
      <div className="glass-card shimmer rounded-[32px] p-8">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="aspect-[3/4] rounded-[28px] bg-white/8" />
          <div className="space-y-4">
            <div className="h-4 w-28 rounded bg-white/10" />
            <div className="h-12 w-2/3 rounded bg-white/10" />
            <div className="h-6 w-1/3 rounded bg-white/10" />
            <div className="h-28 w-full rounded bg-white/10" />
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <div className="h-6 w-40 rounded bg-white/10" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[24px] bg-white/8" />
          ))}
        </div>
      </div>
    </main>
  );
}