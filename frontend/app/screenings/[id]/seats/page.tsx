"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getClientId } from "@/lib/clientId";
import { connectScreeningWS } from "@/lib/ws";
import type { SeatMapResponse, SeatMapSeat, Reservation } from "@/lib/types";
import SeatMap from "@/components/SeatMap";
import ReservationForm from "@/components/ReservationForm";

type Props = { params: Promise<{ id: string }> };

export default function SeatsPage({ params }: Props) {
  const { id } = use(params);
  const screeningId = Number(id);
  const router = useRouter();
  const clientId = useMemo(() => getClientId(), []);
  const [loading, setLoading] = useState(true);
  const [busyHold, setBusyHold] = useState(false);
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [seats, setSeats] = useState<SeatMapSeat[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const selectedRef = useRef<Set<number>>(new Set());
  selectedRef.current = selected;

  async function fetchSeatMap() {
    const data = await api<SeatMapResponse>(`/screenings/${screeningId}/seat-map/`, {
      clientId,
    });
    setSeats(data.seats);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      setError(null);
      setLoading(true);
      try {
        await fetchSeatMap();
        if (mounted) setLoading(false);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message ?? "Failed to load seat map.");
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [screeningId, clientId]);

  useEffect(() => {
    const cleanup = connectScreeningWS(
      screeningId,
      async (evt) => {
        if (evt?.event === "hold_updated") {
          try {
            await fetchSeatMap();
          } catch {
          }
        }
      },
      () => {}
    );

    return cleanup;
  }, [screeningId, clientId]);

  useEffect(() => {
    async function releaseAll() {
      const ids = Array.from(selectedRef.current);
      if (!ids.length) return;

      try {
        await api(`/screenings/${screeningId}/release/`, {
          method: "POST",
          body: { client_id: clientId, seat_ids: ids },
        });
      } catch {
      }
    }

    const onBeforeUnload = () => {
      void releaseAll();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void releaseAll();
    };
  }, [clientId, screeningId]);

  const seatById = useMemo(() => {
    const m = new Map<number, SeatMapSeat>();
    for (const s of seats) m.set(s.id, s);
    return m;
  }, [seats]);

  async function holdSeats(ids: number[]) {
    await api(`/screenings/${screeningId}/hold/`, {
      method: "POST",
      body: { client_id: clientId, seat_ids: ids },
    });
  }

  async function releaseSeats(ids: number[]) {
    await api(`/screenings/${screeningId}/release/`, {
      method: "POST",
      body: { client_id: clientId, seat_ids: ids },
    });
  }

  async function toggleSeat(seatId: number) {
    setError(null);

    const seat = seatById.get(seatId);
    if (!seat) return;

    if (seat.is_reserved) return;
    if (seat.is_held && !seat.held_by_me) return;

    const prev = selected;
    const next = new Set(selected);
    const removing = next.has(seatId);

    if (removing) next.delete(seatId);
    else next.add(seatId);

    setSelected(next);
    setBusyHold(true);

    try {
      if (removing) {
        await releaseSeats([seatId]);
      } else {
        await holdSeats(Array.from(next));
      }
      await fetchSeatMap();
    } catch (e: any) {
      setSelected(prev);
      setError(e?.message ?? "Seat update failed.");
    } finally {
      setBusyHold(false);
    }
  }

  async function submitReservation(payload: { name: string; email: string }) {
    setError(null);
    setSubmittingReservation(true);

    try {
      const seatIds = Array.from(selected);
      if (!seatIds.length) return;

      const res = await api<Reservation>(`/reservations/`, {
        method: "POST",
        body: {
          screening: screeningId,
          customer_name: payload.name,
          customer_email: payload.email,
          seat_ids: seatIds,
          client_id: clientId,
        },
      });

      setSelected(new Set());
      router.push(`/payments/${res.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create reservation.");
      await fetchSeatMap().catch(() => {});
    } finally {
      setSubmittingReservation(false);
    }
  }

  const selectedSeatsText = Array.from(selected)
    .map((id) => seatById.get(id))
    .filter(Boolean)
    .map((seat) => `Row ${seat!.row} Seat ${seat!.number}`);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link href="/movies" className="text-sm underline text-gray-700">
        ← Back to movies
      </Link>

      <h1 className="text-2xl font-semibold mt-3">Seat selection</h1>
      <p className="text-sm text-gray-600 mt-1">Screening #{screeningId}</p>

      {loading ? (
        <div className="mt-6 rounded-xl border p-4">
          <p className="text-sm text-gray-600">Loading seat map...</p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-xl border p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            className="mt-3 rounded-lg border px-3 py-2 text-sm"
            onClick={() => {
              setLoading(true);
              fetchSeatMap()
                .catch((e: any) => setError(e?.message ?? "Failed to load seat map."))
                .finally(() => setLoading(false));
            }}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold">Choose your seats</h2>
              {busyHold ? (
                <span className="text-sm text-gray-600">Updating seats...</span>
              ) : null}
            </div>

            <div className="mt-4">
              <SeatMap
                seats={seats}
                selectedIds={selected}
                onToggle={toggleSeat}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border p-4">
              <h3 className="font-semibold">Selection summary</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedSeatsText.length
                  ? `${selectedSeatsText.length} seat(s) selected`
                  : "No seats selected yet."}
              </p>

              {selectedSeatsText.length ? (
                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                  {selectedSeatsText.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <ReservationForm
              disabled={busyHold || submittingReservation}
              selectedCount={selected.size}
              onSubmit={submitReservation}
            />

            {submittingReservation ? (
              <div className="rounded-xl border p-4">
                <p className="text-sm text-gray-600">
                  Creating reservation and redirecting to payment...
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}