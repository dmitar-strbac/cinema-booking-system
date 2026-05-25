"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/lib/api";
import type { Reservation } from "@/lib/types";

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Reservation[]>("/reservations/")
      .then(setReservations)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AdminShell>
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-yellow-300/80">Admin</p>
        <h1 className="mt-3 text-5xl font-semibold text-white">Reservations</h1>
        <p className="mt-4 text-white/65">Review customer reservations and payment status.</p>
      </div>

      {error ? <p className="mt-6 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-8 grid gap-4">
        {reservations.map((r) => (
          <div key={r.id} className="glass-card rounded-[24px] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {r.screening_detail?.movie?.title ?? `Reservation #${r.id}`}
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  {r.customer_name} • {r.customer_email}
                </p>
                <p className="mt-2 text-sm text-white/50">
                  Hall: {r.screening_detail?.hall?.name ?? "Unknown"} • Seats:{" "}
                  {(r.reserved_seats ?? []).map((s) => `R${s.row}-S${s.number}`).join(", ") || "No seats"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-yellow-200">{r.payment_amount} RSD</p>
                <p className="mt-1 text-xs text-white/45">{r.status}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}