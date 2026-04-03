"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="rounded-xl border p-6">
        <h1 className="text-2xl font-semibold">Payment cancelled</h1>
        <p className="mt-2 text-sm text-gray-600">
          The payment was cancelled and the reservation was not confirmed.
        </p>

        {reservationId ? (
          <p className="mt-4 text-sm text-gray-700">
            Reservation ID: <span className="font-medium">#{reservationId}</span>
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/movies"
            className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          >
            Back to movies
          </Link>
        </div>
      </div>
    </main>
  );
}