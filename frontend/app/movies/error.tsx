"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Movies</h1>
      <div className="mt-6 rounded-xl border p-4">
        <p className="text-sm text-red-700">Failed to load movies: {error.message}</p>
        <button
          onClick={() => reset()}
          className="mt-3 rounded-lg border px-3 py-2 text-sm"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
