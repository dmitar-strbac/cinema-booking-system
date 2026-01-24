import ScreeningList from "@/components/ScreeningList";
import { api } from "@/lib/api";
import { Movie, Screening } from "@/lib/types";
import Link from "next/link";

type Props = { params: { id: string } };

export default async function MovieDetailsPage({ params }: Props) {
  const movieId = params.id;

  const movie = await api<Movie>(`/movies/${movieId}/`);
  const screenings = await api<Screening[]>("/screenings/");

  const filtered = screenings.filter((s) => String(s.movie?.id) === String(movie.id));

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link href="/movies" className="text-sm underline text-gray-700">
        ← Back to movies
      </Link>

      <div className="mt-4 flex gap-6">
        <div className="h-48 w-36 overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt={movie.title} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-gray-500">No poster</span>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{movie.title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {movie.genre} • {movie.duration_minutes} min
          </p>
          {movie.description ? (
            <p className="text-sm text-gray-700 mt-3">{movie.description}</p>
          ) : (
            <p className="text-sm text-gray-500 mt-3">No description.</p>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Screenings</h2>
        <div className="mt-3">
          <ScreeningList screenings={filtered} />
        </div>
      </section>
    </main>
  );
}
