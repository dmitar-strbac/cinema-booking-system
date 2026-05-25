"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminOverview } from "@/lib/types";
import AdminShell from "@/components/AdminShell";

function formatDate(v: string) {
  return new Date(v).toLocaleString();
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api<AdminOverview>("/admin/overview/");
        setData(res);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="page-shell py-10">
        <div className="glass-card rounded-[28px] p-6">
          <p className="text-white/70">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <AdminShell>
      <section>
        <p className="text-sm uppercase tracking-[0.35em] text-yellow-300/80">
          Admin
        </p>

        <h1 className="mt-3 text-5xl font-semibold text-white">
          Dashboard
        </h1>

        <p className="mt-4 text-white/65">
          Cinema platform management overview.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="glass-card rounded-[28px] p-6">
          <p className="text-sm text-white/50">Movies</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">
            {data.stats.movies}
          </h2>
        </div>

        <div className="glass-card rounded-[28px] p-6">
          <p className="text-sm text-white/50">Reservations</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">
            {data.stats.reservations}
          </h2>
        </div>

        <div className="glass-card rounded-[28px] p-6">
          <p className="text-sm text-white/50">Revenue</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">
            {data.stats.revenue} RSD
          </h2>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-[28px] p-6">
          <h2 className="text-2xl font-semibold text-white">
            Latest Reservations
          </h2>

          <div className="mt-6 space-y-4">
            {data.latest_reservations.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">
                      {r.customer_name}
                    </p>

                    <p className="mt-1 text-sm text-white/55">
                      {r.movie}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-yellow-200">
                      {r.amount} RSD
                    </p>

                    <p className="mt-1 text-xs text-white/45">
                      {r.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[28px] p-6">
          <h2 className="text-2xl font-semibold text-white">
            Upcoming Screenings
          </h2>

          <div className="mt-6 space-y-4">
            {data.upcoming_screenings.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <p className="font-medium text-white">
                  {s.movie}
                </p>

                <p className="mt-1 text-sm text-white/55">
                  Hall: {s.hall}
                </p>

                <p className="mt-2 text-xs text-yellow-200">
                  {formatDate(s.start_time)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}