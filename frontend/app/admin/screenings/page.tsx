"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/lib/api";
import type { Hall, Movie, Screening } from "@/lib/types";

const emptyForm = {
  movie_id: "",
  hall_id: "",
  start_time: "",
  end_time: "",
  language: "EN",
  is_3d: false,
  base_price: "",
};

function toApiDate(value: string) {
  return new Date(value).toISOString();
}

export default function AdminScreeningsPage() {
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [s, m, h] = await Promise.all([
      api<Screening[]>("/screenings/"),
      api<Movie[]>("/movies/"),
      api<Hall[]>("/halls/"),
    ]);
    setScreenings(s);
    setMovies(m);
    setHalls(h);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function saveScreening() {
    setError(null);

    const body = {
      movie_id: Number(form.movie_id),
      hall_id: Number(form.hall_id),
      start_time: toApiDate(form.start_time),
      end_time: toApiDate(form.end_time),
      language: form.language,
      is_3d: form.is_3d,
      base_price: form.base_price,
    };

    try {
      if (editingId) {
        await api<Screening>(`/screenings/${editingId}/`, { method: "PATCH", body });
      } else {
        await api<Screening>("/screenings/", { method: "POST", body });
      }

      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteScreening(id: number) {
    if (!confirm("Delete this screening?")) return;
    await api(`/screenings/${id}/`, { method: "DELETE" });
    await load();
  }

  return (
    <AdminShell>
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-yellow-300/80">Admin</p>
        <h1 className="mt-3 text-5xl font-semibold text-white">Screenings</h1>
        <p className="mt-4 text-white/65">Manage movie showtimes, halls and pricing.</p>
      </div>

      {error ? <p className="mt-6 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="glass-card h-fit rounded-[28px] p-6">
          <h2 className="text-2xl font-semibold text-white">
            {editingId ? "Edit screening" : "Add screening"}
          </h2>

          <div className="mt-5 grid gap-3">
            <select value={form.movie_id} onChange={(e) => setForm({ ...form, movie_id: e.target.value })} className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white">
              <option value="">Select movie</option>
              {movies.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>

            <select value={form.hall_id} onChange={(e) => setForm({ ...form, hall_id: e.target.value })} className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white">
              <option value="">Select hall</option>
              {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>

            <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
            <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />

            <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white">
              {["SR", "EN", "DE", "OTHER"].map((l) => <option key={l}>{l}</option>)}
            </select>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/80">
              <input type="checkbox" checked={form.is_3d} onChange={(e) => setForm({ ...form, is_3d: e.target.checked })} />
              3D screening
            </label>

            <input placeholder="Base price" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />

            <button onClick={saveScreening} className="cursor-pointer rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black">
              {editingId ? "Save changes" : "Create screening"}
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {screenings.map((s) => (
            <div key={s.id} className="glass-card rounded-[24px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">{s.movie?.title}</h3>
                  <p className="mt-1 text-sm text-white/60">
                    {new Date(s.start_time).toLocaleString()} • {s.hall?.name} • {s.is_3d ? "3D" : "2D"}
                  </p>
                  <p className="mt-2 text-sm text-yellow-200">{s.base_price} RSD</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => {
                    setEditingId(s.id);
                    setForm({
                      movie_id: String(s.movie.id),
                      hall_id: String(s.hall.id),
                      start_time: s.start_time.slice(0, 16),
                      end_time: s.end_time.slice(0, 16),
                      language: s.language,
                      is_3d: s.is_3d,
                      base_price: s.base_price,
                    });
                  }} className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-sm text-white">Edit</button>

                  <button onClick={() => deleteScreening(s.id)} className="cursor-pointer rounded-full border border-rose-400/20 px-4 py-2 text-sm text-rose-200">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}