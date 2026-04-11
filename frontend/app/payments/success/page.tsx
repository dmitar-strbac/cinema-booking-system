"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ReservationQrResponse } from "@/lib/types";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");

  const [qr, setQr] = useState<ReservationQrResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(reservationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservationId) return;

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await api<ReservationQrResponse>(`/reservations/${reservationId}/qr/`);

        if (!mounted) return;
        setQr(data);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load QR ticket.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [reservationId]);

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
          Your reservation has been confirmed successfully. Your digital ticket is ready below.
        </p>

        {reservationId ? (
          <p className="mt-6 text-sm text-white/80">
            Reservation ID: <span className="font-semibold text-yellow-200">#{reservationId}</span>
          </p>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold text-white">QR Ticket</h2>

            {loading ? (
              <p className="mt-4 text-sm text-white/60">Loading QR code...</p>
            ) : error ? (
              <p className="mt-4 text-sm text-rose-300">{error}</p>
            ) : qr ? (
              <div className="mt-4 rounded-[24px] bg-white p-4">
                <img
                  src={`data:image/png;base64,${qr.qr_image_base64}`}
                  alt="Reservation QR ticket"
                  className="h-auto w-full rounded-xl"
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/60">QR ticket unavailable.</p>
            )}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold text-white">Ticket details</h2>

            {qr ? (
              <div className="mt-4 space-y-3 text-sm text-white/75">
                <p>
                  <span className="font-medium text-white">Ticket code:</span> {qr.ticket_code}
                </p>
                <p>
                  <span className="font-medium text-white">Format:</span> Digital QR ticket
                </p>
                <p>
                  <span className="font-medium text-white">Usage:</span> Present this QR code for validation at entry
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/60">
                Ticket details will appear once the QR code is loaded.
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/movies"
                className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black"
              >
                Browse more movies
              </Link>

              {reservationId ? (
                <Link
                  href={`/payments/${reservationId}`}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white"
                >
                  Back to payment details
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}