"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Reservation, StartPaymentResponse } from "@/lib/types";

type Props = {
  params: Promise<{ reservationId: string }>;
};

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function PaymentPage({ params }: Props) {
  const { reservationId } = use(params);
  const router = useRouter();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<StartPaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [method, setMethod] = useState<"card" | "paypal">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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

  const isValid = useMemo(() => {
    if (method === "paypal") return true;

    const rawCard = cardNumber.replace(/\s/g, "");
    const rawCvv = cvv.replace(/\D/g, "");

    return (
      rawCard.length === 16 &&
      cardName.trim().length >= 3 &&
      expiry.length === 5 &&
      rawCvv.length >= 3
    );
  }, [method, cardNumber, cardName, expiry, cvv]);

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

  async function handlePayNow() {
    setFormError(null);

    if (!isValid) {
      setFormError("Please fill in the payment details correctly.");
      return;
    }

    await handleConfirm();
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
          Review your reservation and continue through a simulated Stripe-like checkout.
        </p>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="glass-card fade-in rounded-[28px] p-6 md:p-8">
          <div>
            <h2 className="text-xl font-semibold text-white">Reservation details</h2>
            <div className="mt-5 grid gap-3 text-sm text-white/75">
              <p>
                <span className="font-medium text-white">Reservation ID:</span> #{reservation.id}
              </p>
              <p>
                <span className="font-medium text-white">Customer:</span> {reservation.customer_name}
              </p>
              <p>
                <span className="font-medium text-white">Email:</span> {reservation.customer_email}
              </p>
              <p>
                <span className="font-medium text-white">Status:</span> {reservation.status}
              </p>
              <p>
                <span className="font-medium text-white">Seats:</span> {reservation.reserved_seats?.length ?? 0}
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-white/8 pt-6">
            <h2 className="text-xl font-semibold text-white">Payment details</h2>
            <div className="mt-5 grid gap-3 text-sm text-white/75">
              <p>
                <span className="font-medium text-white">Provider:</span> {paymentInfo.payment_provider}
              </p>
              <p>
                <span className="font-medium text-white">Reference:</span> {paymentInfo.payment_reference}
              </p>
              <p>
                <span className="font-medium text-white">Amount:</span> {paymentInfo.payment_amount}{" "}
                {paymentInfo.currency}
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
              onClick={() => setShowModal(true)}
              disabled={busy}
              className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black shadow-xl shadow-yellow-500/20 disabled:opacity-60"
            >
              Open payment modal
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              Cancel payment
            </button>
          </div>
        </aside>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#101114] p-6 shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                  Secure checkout
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Pay {paymentInfo.payment_amount} {paymentInfo.currency}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("card")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  method === "card"
                    ? "border-indigo-400 bg-indigo-400/10 text-white"
                    : "border-white/10 bg-white/5 text-white/65"
                }`}
              >
                <div className="font-medium">💳 Card</div>
                <div className="mt-1 text-xs opacity-80">Visa, Mastercard</div>
              </button>

              <button
                type="button"
                onClick={() => setMethod("paypal")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  method === "paypal"
                    ? "border-indigo-400 bg-indigo-400/10 text-white"
                    : "border-white/10 bg-white/5 text-white/65"
                }`}
              >
                <div className="font-medium">🅿️ PayPal</div>
                <div className="mt-1 text-xs opacity-80">Fast checkout</div>
              </button>
            </div>

            {method === "card" ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-[24px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-5 text-white shadow-lg">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/75">
                    Card preview
                  </p>
                  <p className="mt-6 text-lg font-semibold tracking-[0.2em]">
                    {cardNumber || "•••• •••• •••• ••••"}
                  </p>
                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase text-white/70">Card holder</p>
                      <p className="mt-1 text-sm font-medium">
                        {cardName || "YOUR NAME"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-white/70">Expires</p>
                      <p className="mt-1 text-sm font-medium">{expiry || "MM/YY"}</p>
                    </div>
                  </div>
                </div>

                <input
                  placeholder="1234 1234 1234 1234"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none"
                />

                <input
                  placeholder="Cardholder name"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none"
                  />
                  <input
                    placeholder="CVV"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-blue-400/20 bg-blue-400/10 p-5 text-sm text-blue-100">
                <p className="font-medium">PayPal simulation</p>
                <p className="mt-2 text-blue-100/80">
                  This simulates redirecting to PayPal and returning after successful authorization.
                </p>
              </div>
            )}

            {formError ? (
              <p className="mt-4 text-sm text-rose-300">{formError}</p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handlePayNow}
                disabled={busy || !isValid}
                className="rounded-full bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-40"
              >
                {busy ? "Processing payment..." : `Pay ${paymentInfo.payment_amount} ${paymentInfo.currency}`}
              </button>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={busy}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white"
              >
                Continue editing
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}