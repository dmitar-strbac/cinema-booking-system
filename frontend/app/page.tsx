import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold">Cinema Booking</h1>
      <p className="text-sm text-gray-600 mt-2">
        Click through movies → screenings → seats → reservation.
      </p>

      <div className="mt-6">
        <Link
          href="/movies"
          className="inline-flex items-center rounded-lg bg-black text-white px-4 py-2"
        >
          Browse movies
        </Link>
      </div>
    </main>
  );
}
