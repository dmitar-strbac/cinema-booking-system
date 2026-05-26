"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");

  return (
    <main className="page-shell py-14">
      <div className="glass-card fade-in rounded-[32px] p-8 md:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-400/15 text-3xl">
          ✖
        </div>

        <h1 className="mt-6 text-4xl font-semibold text-white md:text-5xl">
          Payment cancelled
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
          The payment was cancelled and the reservation was not confirmed. You can
          return to movies and start a new booking flow whenever you want.
        </p>

        {reservationId ? (
          <p className="mt-6 text-sm text-white/80">
            Your booking was not completed. You can start a new reservation anytime.
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/movies"
            className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black"
          >
            Back to movies
          </Link>
        </div>
      </div>
    </main>
  );
}