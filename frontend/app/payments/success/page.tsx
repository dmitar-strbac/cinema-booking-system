"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");

  return (
    <main className="page-shell py-14">
      <div className="glass-card fade-in rounded-[32px] p-8 md:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400/15 text-3xl">
          ✅
        </div>

        <h1 className="mt-6 text-4xl font-semibold text-white md:text-5xl">
          Payment successful
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
          Your reservation has been confirmed successfully. You can continue browsing
          more movies or return to the payment details page.
        </p>

        {reservationId ? (
          <p className="mt-6 text-sm text-white/80">
            Reservation ID: <span className="font-semibold text-yellow-200">#{reservationId}</span>
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/movies"
            className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black"
          >
            Browse more movies
          </Link>

          <Link
            href={`/payments/${reservationId}`}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white"
          >
            Back to payment details
          </Link>
        </div>
      </div>
    </main>
  );
}