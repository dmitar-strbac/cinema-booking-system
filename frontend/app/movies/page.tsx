import MovieCard from "@/components/MovieCard";
import { api } from "@/lib/api";
import { Movie } from "@/lib/types";

export default async function MoviesPage() {
  const movies = await api<Movie[]>("/movies/"); 

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Movies</h1>
      <p className="text-sm text-gray-600 mt-1">
        Browse movies and pick a screening.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {movies.map((m) => (
          <MovieCard key={m.id} movie={m} />
        ))}
      </div>
    </main>
  );
}
