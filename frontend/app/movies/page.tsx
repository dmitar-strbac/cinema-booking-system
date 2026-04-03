import MovieCard from "@/components/MovieCard";
import { api } from "@/lib/api";
import { Movie } from "@/lib/types";

export default async function MoviesPage() {
  const movies = await api<Movie[]>("/movies/");

  return (
    <main className="page-shell py-10 md:py-14">
      <section className="fade-in">
        <p className="text-sm font-medium uppercase tracking-[0.32em] text-yellow-300/80">
          Now showing
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">
          Choose your next movie night
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
          Discover movies, open details, and continue to screenings and seat selection
          in a premium booking flow.
        </p>
      </section>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {movies.map((m, index) => (
          <div
            key={m.id}
            className={index < 3 ? "fade-in-delay" : "fade-in-delay-2"}
          >
            <MovieCard movie={m} />
          </div>
        ))}
      </div>
    </main>
  );
}