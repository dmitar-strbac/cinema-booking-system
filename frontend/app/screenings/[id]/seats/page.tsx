"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getClientId } from "@/lib/clientId";
import { connectScreeningWS } from "@/lib/ws";
import type { SeatMapResponse, SeatMapSeat, Reservation, Screening } from "@/lib/types";
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

  const [screeningTitle, setScreeningTitle] = useState("");

  async function fetchSeatMap() {
    const [seatMap, screening] = await Promise.all([
      api<SeatMapResponse>(`/screenings/${screeningId}/seat-map/`, {
        clientId,
      }),
      api<Screening>(`/screenings/${screeningId}/`),
    ]);

    setSeats(seatMap.seats);
    setScreeningTitle(screening.movie.title);
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
          } catch {}
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
      } catch {}
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
    .map((seat) => `Row ${seat!.row} • Seat ${seat!.number}`);

  return (
    <main className="page-shell py-10 md:py-14">

      <section className="fade-in mt-6">
        <p className="text-sm uppercase tracking-[0.28em] text-yellow-300/80">
          Seat booking
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">
          Choose your seats
        </h1>
        <p className="mt-3 text-base text-white/60">{screeningTitle || "Loading screening..."}</p>
      </section>

      {loading ? (
        <div className="glass-card shimmer mt-8 rounded-[28px] p-6">
          <p className="text-sm text-white/60">Loading seat map...</p>
        </div>
      ) : null}

      {error ? (
        <div className="glass-card mt-8 rounded-[28px] p-6">
          <p className="text-sm text-rose-300">{error}</p>
          <button
            className="mt-4 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white"
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
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="glass-card fade-in rounded-[28px] p-5 md:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Interactive seat map</h2>
                <p className="mt-1 text-sm text-white/55">
                  Select available seats and continue to payment.
                </p>
              </div>

              {busyHold ? (
                <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-200">
                  Updating...
                </span>
              ) : null}
            </div>

            <div className="mt-6">
              <SeatMap seats={seats} selectedIds={selected} onToggle={toggleSeat} />
            </div>
          </div>

          <div className="space-y-5">
            <div className="glass-card fade-in-delay rounded-[28px] p-6">
              <h3 className="text-lg font-semibold text-white">Selection summary</h3>
              <p className="mt-2 text-sm text-white/60">
                {selectedSeatsText.length
                  ? `${selectedSeatsText.length} seat(s) selected`
                  : "No seats selected yet."}
              </p>

              {selectedSeatsText.length ? (
                <ul className="mt-4 space-y-2 text-sm text-white/80">
                  {selectedSeatsText.map((label) => (
                    <li
                      key={label}
                      className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2"
                    >
                      {label}
                    </li>
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
              <div className="glass-card rounded-[24px] p-4">
                <p className="text-sm text-white/65">
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