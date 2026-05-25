"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import type { Reservation } from "@/lib/types";

function formatDateTime(value?: string) {
  if (!value) return "Unknown time";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: Reservation["status"]) {
  if (status === "CONFIRMED") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (status === "PENDING") return "border-yellow-400/20 bg-yellow-400/10 text-yellow-200";
  return "border-rose-400/20 bg-rose-400/10 text-rose-200";
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const auth = isLoggedIn();
    setLoggedIn(auth);

    if (!auth) {
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api<Reservation[]>("/reservations/my/");
        if (!mounted) return;
        setTickets(data);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load tickets.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!loggedIn) {
    return (
      <main className="page-shell py-14">
        <div className="glass-card rounded-[32px] p-8">
          <h1 className="text-4xl font-semibold text-white">My Tickets</h1>
          <p className="mt-4 text-white/65">Log in to view your reservations and QR tickets.</p>
          <Link
            href="/login?next=/my-tickets"
            className="mt-6 inline-flex rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black"
          >
            Log in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell py-10 md:py-14">
      <section className="fade-in">
        <p className="text-sm uppercase tracking-[0.32em] text-yellow-300/80">
          Account
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">
          My Tickets
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
          View your reservation history, ticket status, and confirmed QR tickets.
        </p>
      </section>

      {loading ? (
        <div className="glass-card shimmer mt-8 rounded-[28px] p-6">
          <p className="text-sm text-white/60">Loading tickets...</p>
        </div>
      ) : null}

      {error ? (
        <div className="glass-card mt-8 rounded-[28px] p-6">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      {!loading && !error && tickets.length === 0 ? (
        <div className="glass-card mt-8 rounded-[28px] p-8">
          <h2 className="text-2xl font-semibold text-white">No tickets yet</h2>
          <p className="mt-3 text-white/65">Book your first movie ticket to see it here.</p>
          <Link
            href="/movies"
            className="mt-6 inline-flex rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black"
          >
            Browse movies
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid gap-5">
        {tickets.map((reservation) => {
          const screening = reservation.screening_detail;
          const movie = screening?.movie;
          const seats = reservation.reserved_seats ?? [];

          return (
            <article
              key={reservation.id}
              className="glass-card fade-in rounded-[28px] p-5 md:p-6"
            >
              <div className="grid gap-5 md:grid-cols-[110px_1fr_auto]">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {movie?.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="h-40 w-full object-cover md:h-full"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center text-sm text-white/40">
                      No poster
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-white">
                      {movie?.title ?? `Reservation #${reservation.id}`}
                    </h2>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass(reservation.status)}`}>
                      {reservation.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-white/65">
                    {formatDateTime(screening?.start_time)}
                  </p>

                  <p className="mt-2 text-sm text-white/65">
                    Hall: {screening?.hall?.name ?? "Unknown"} • Seats:{" "}
                    {seats.length
                      ? seats.map((s) => `R${s.row ?? "?"}-S${s.number ?? "?"}`).join(", ")
                      : "No seats"}
                  </p>

                  {reservation.ticket_code ? (
                    <p className="mt-3 text-sm text-yellow-200">
                      Ticket code: {reservation.ticket_code}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 md:items-end">
                  {reservation.status === "CONFIRMED" ? (
                    <Link
                      href={`/payments/success?reservationId=${reservation.id}`}
                      className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-4 py-2 text-sm font-semibold text-black"
                    >
                      View QR ticket
                    </Link>
                  ) : reservation.status === "PENDING" ? (
                    <Link
                      href={`/payments/${reservation.id}`}
                      className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm font-medium text-yellow-100"
                    >
                      Continue payment
                    </Link>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/45">
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}