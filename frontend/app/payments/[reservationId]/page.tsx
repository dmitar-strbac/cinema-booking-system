"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Reservation, StartPaymentResponse } from "@/lib/types";

type Props = {
  params: Promise<{ reservationId: string }>;
};

export default function PaymentPage({ params }: Props) {
  const { reservationId } = use(params);
  const router = useRouter();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<StartPaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const reservationData = await api<Reservation>(`/reservations/${reservationId}/`);
        const paymentData = await api<StartPaymentResponse>(
          `/reservations/${reservationId}/start-payment/`,
          { method: "POST", body: {} }
        );

        if (!mounted) return;
        setReservation(reservationData);
        setPaymentInfo(paymentData);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to initialize payment.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [reservationId]);

  async function handleCancel() {
    setBusy(true);
    setError(null);

    try {
      const res = await api<{ id: number; status: string }>(
        `/reservations/${reservationId}/cancel-payment/`,
        {
          method: "POST",
          body: {},
        }
      );

      router.push(`/payments/cancel?reservationId=${res.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Payment cancellation failed.");
      setBusy(false);
    }
  }

  async function handleStripeCheckout() {
    setBusy(true);

    try {
      const res = await api<{ checkout_url: string }>(
        `/reservations/${reservationId}/create-checkout-session/`,
        {
          method: "POST",
          body: {},
        }
      );

      window.location.href = res.checkout_url;
    } catch (e: any) {
      setError(e?.message ?? "Failed to initialize Stripe checkout.");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="page-shell py-12">
        <div className="glass-card shimmer rounded-[28px] p-6">
          <p className="text-sm text-white/60">Loading payment details...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell py-12">
        <div className="glass-card mt-6 rounded-[28px] p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      </main>
    );
  }

  if (!reservation || !paymentInfo) {
    return (
      <main className="page-shell py-12">
        <div className="glass-card rounded-[28px] p-6">
          <p className="text-sm text-white/60">Payment data unavailable.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell py-10 md:py-14">
      <section className="fade-in mt-6">
        <p className="text-sm uppercase tracking-[0.3em] text-yellow-300/80">
          Payment
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">
          Complete your booking
        </h1>
        <p className="mt-3 text-base text-white/60">
          Review your reservation and continue through Stripe secure checkout.
        </p>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="glass-card fade-in rounded-[28px] p-6 md:p-8">
          <h2 className="text-xl font-semibold text-white">Booking details</h2>
            <div className="mt-5 grid gap-3 text-sm text-white/75">
              <p>
                <span className="font-medium text-white">Movie:</span>{" "}
                {reservation.screening_detail?.movie?.title ?? "Movie details unavailable"}
              </p>

              <p>
                <span className="font-medium text-white">Hall:</span>{" "}
                {reservation.screening_detail?.hall?.name ?? "Hall details unavailable"}
              </p>

              <p>
                <span className="font-medium text-white">Seats:</span>{" "}
                {(reservation.reserved_seats ?? [])
                  .map((s) => `Row ${s.row}, Seat ${s.number}`)
                  .join(" • ") || "No seats selected"}
              </p>

              <p>
                <span className="font-medium text-white">Customer:</span>{" "}
                {reservation.customer_name}
              </p>

              <p>
                <span className="font-medium text-white">Email:</span>{" "}
                {reservation.customer_email}
              </p>

              <p>
                <span className="font-medium text-white">Status:</span>{" "}
                {reservation.status}
              </p>
            </div>

          <div className="mt-8 border-t border-white/8 pt-6">
            <h2 className="text-xl font-semibold text-white">Payment summary</h2>
            <div className="mt-5 grid gap-3 text-sm text-white/75">
              <p>
                <span className="font-medium text-white">Payment method:</span>{" "}
                Secure Stripe Checkout
              </p>

              <p>
                <span className="font-medium text-white">Amount:</span>{" "}
                {paymentInfo.payment_amount} {paymentInfo.currency}
              </p>
            </div>
          </div>
        </div>

        <aside className="glass-card fade-in-delay rounded-[28px] p-6">
          <div className="rounded-[24px] border border-yellow-400/15 bg-gradient-to-br from-yellow-400/12 to-amber-300/8 p-5">
            <p className="text-sm uppercase tracking-[0.25em] text-yellow-200/80">
              Checkout
            </p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Open the payment modal to simulate a real checkout experience.
            </p>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/60">Amount due</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {paymentInfo.payment_amount}{" "}
              <span className="text-lg text-yellow-200">{paymentInfo.currency}</span>
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleStripeCheckout}
              disabled={busy}
              className="cursor-pointer disabled:cursor-not-allowed rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black shadow-xl shadow-yellow-500/20 disabled:opacity-60"
            >
              Continue to checkout
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="cursor-pointer disabled:cursor-not-allowed rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              Cancel payment
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}