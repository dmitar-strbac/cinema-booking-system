"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/lib/api";
import type { Movie } from "@/lib/types";

const emptyForm = {
  title: "",
  description: "",
  duration_minutes: "",
  genre: "ACTION",
  release_year: "",
  poster_url: "",
};

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await api<Movie[]>("/movies/");
    setMovies(data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function saveMovie() {
    setError(null);

    const body = {
      ...form,
      duration_minutes: Number(form.duration_minutes),
      release_year: form.release_year ? Number(form.release_year) : null,
    };

    try {
      if (editingId) {
        await api<Movie>(`/movies/${editingId}/`, { method: "PATCH", body });
      } else {
        await api<Movie>("/movies/", { method: "POST", body });
      }

      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteMovie(id: number) {
    if (!confirm("Delete this movie?")) return;
    await api(`/movies/${id}/`, { method: "DELETE" });
    await load();
  }

  return (
    <AdminShell>
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-yellow-300/80">Admin</p>
        <h1 className="mt-3 text-5xl font-semibold text-white">Movies</h1>
        <p className="mt-4 text-white/65">Create, edit and manage cinema movies.</p>
      </div>

      {error ? <p className="mt-6 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="glass-card h-fit rounded-[28px] p-6">
          <h2 className="text-2xl font-semibold text-white">
            {editingId ? "Edit movie" : "Add movie"}
          </h2>

          <div className="mt-5 grid gap-3">
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-28 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
            <input placeholder="Duration minutes" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
            <select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white">
              {["ACTION", "COMEDY", "DRAMA", "HORROR", "ROMANCE", "SCIFI", "ANIMATION", "OTHER"].map((g) => <option key={g}>{g}</option>)}
            </select>
            <input placeholder="Release year" value={form.release_year} onChange={(e) => setForm({ ...form, release_year: e.target.value })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
            <input placeholder="Poster URL" value={form.poster_url} onChange={(e) => setForm({ ...form, poster_url: e.target.value })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />

            <button onClick={saveMovie} className="cursor-pointer rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black">
              {editingId ? "Save changes" : "Create movie"}
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {movies.map((m) => (
            <div key={m.id} className="glass-card rounded-[24px] p-5">
              <div className="flex gap-4">
                {m.poster_url ? <img src={m.poster_url} className="h-28 w-20 rounded-xl object-cover" /> : null}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">{m.title}</h3>
                  <p className="mt-1 text-sm text-white/60">{m.genre} • {m.duration_minutes} min</p>
                  <p className="mt-2 line-clamp-2 text-sm text-white/50">{m.description}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => {
                    setEditingId(m.id);
                    setForm({
                      title: m.title,
                      description: m.description ?? "",
                      duration_minutes: String(m.duration_minutes),
                      genre: m.genre,
                      release_year: m.release_year ? String(m.release_year) : "",
                      poster_url: m.poster_url ?? "",
                    });
                  }} className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-sm text-white">Edit</button>
                  <button onClick={() => deleteMovie(m.id)} className="cursor-pointer rounded-full border border-rose-400/20 px-4 py-2 text-sm text-rose-200">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}