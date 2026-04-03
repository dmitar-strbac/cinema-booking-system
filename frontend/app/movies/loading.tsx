export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="h-7 w-40 bg-gray-200 rounded" />
      <div className="mt-2 h-4 w-72 bg-gray-200 rounded" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <div className="flex gap-4">
              <div className="h-28 w-20 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-2/3 bg-gray-200 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
                <div className="h-3 w-1/3 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
