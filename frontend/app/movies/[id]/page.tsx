import ScreeningList from "@/components/ScreeningList";
import { api } from "@/lib/api";
import { Movie, Screening } from "@/lib/types";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

export default async function MovieDetailsPage({ params }: Props) {
  const { id: movieId } = await params;

  const movie = await api<Movie>(`/movies/${movieId}/`);
  const screenings = await api<Screening[]>("/screenings/");

  const filtered = screenings.filter((s) => String(s.movie?.id) === String(movie.id));

  return (
    <main className="page-shell py-10 md:py-14">

      <section className="fade-in mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="glass-card gold-ring overflow-hidden rounded-[28px]">
          <div className="aspect-[3/4] bg-white/5">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/45">
                No poster
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-[28px] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-yellow-300/80">
            Movie details
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">
            {movie.title}
          </h1>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
              {movie.genre}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
              {movie.duration_minutes} min
            </span>
            {movie.release_year ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
                {movie.release_year}
              </span>
            ) : null}
          </div>

          {movie.description ? (
            <p className="mt-6 max-w-3xl text-base leading-7 text-white/70">
              {movie.description}
            </p>
          ) : (
            <p className="mt-6 text-base text-white/45">No description available.</p>
          )}
        </div>
      </section>

      <section className="fade-in-delay mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-yellow-300/80">
              Screenings
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Available showtimes
            </h2>
          </div>
        </div>

        <ScreeningList screenings={filtered} />
      </section>
    </main>
  );
}