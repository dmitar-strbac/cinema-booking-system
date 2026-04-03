"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
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

  async function handleConfirm() {
    setBusy(true);
    setError(null);

    try {
      const res = await api<Reservation>(`/reservations/${reservationId}/confirm-payment/`, {
        method: "POST",
        body: {},
      });

      router.push(`/payments/success?reservationId=${res.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Payment confirmation failed.");
      setBusy(false);
    }
  }

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

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-gray-600">Loading payment details...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Link href="/movies" className="text-sm underline text-gray-700">
          ← Back to movies
        </Link>

        <div className="mt-6 rounded-xl border p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </main>
    );
  }

  if (!reservation || !paymentInfo) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-600">Payment data unavailable.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/movies" className="text-sm underline text-gray-700">
        ← Back to movies
      </Link>

      <h1 className="text-2xl font-semibold mt-3">Payment</h1>
      <p className="text-sm text-gray-600 mt-1">
        Complete the payment for your pending reservation.
      </p>

      <div className="mt-6 rounded-xl border p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Reservation details</h2>
          <div className="mt-3 grid gap-2 text-sm text-gray-700">
            <p>
              <span className="font-medium">Reservation ID:</span> #{reservation.id}
            </p>
            <p>
              <span className="font-medium">Customer:</span> {reservation.customer_name}
            </p>
            <p>
              <span className="font-medium">Email:</span> {reservation.customer_email}
            </p>
            <p>
              <span className="font-medium">Status:</span> {reservation.status}
            </p>
            <p>
              <span className="font-medium">Seats:</span>{" "}
              {reservation.reserved_seats?.length ?? 0}
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold">Payment details</h2>
          <div className="mt-3 grid gap-2 text-sm text-gray-700">
            <p>
              <span className="font-medium">Provider:</span> {paymentInfo.payment_provider}
            </p>
            <p>
              <span className="font-medium">Reference:</span> {paymentInfo.payment_reference}
            </p>
            <p>
              <span className="font-medium">Amount:</span> {paymentInfo.payment_amount}{" "}
              {paymentInfo.currency}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          This is a simulated payment screen for the current project phase.
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {busy ? "Processing..." : "Simulate successful payment"}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={busy}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-60"
          >
            Cancel payment
          </button>
        </div>
      </div>
    </main>
  );
}