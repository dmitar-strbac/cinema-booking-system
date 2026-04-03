export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="h-4 w-32 bg-gray-200 rounded" />
      <div className="mt-3 h-7 w-48 bg-gray-200 rounded" />
      <div className="mt-2 h-4 w-40 bg-gray-200 rounded" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border p-4">
          <div className="h-5 w-28 bg-gray-200 rounded" />
          <div className="mt-4 h-64 bg-gray-100 rounded-xl" />
        </div>
        <div className="rounded-xl border p-4">
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="mt-4 space-y-3">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </main>
  );
}
