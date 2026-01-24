export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="h-4 w-32 bg-gray-200 rounded" />

      <div className="mt-4 flex gap-6">
        <div className="h-48 w-36 bg-gray-200 rounded-xl" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-1/3 bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
        </div>
      </div>

      <div className="mt-8">
        <div className="h-6 w-28 bg-gray-200 rounded" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="h-5 w-2/3 bg-gray-200 rounded" />
              <div className="mt-2 h-4 w-1/2 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
