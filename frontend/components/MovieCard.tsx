import Link from "next/link";
import { Movie } from "@/lib/types";

export default function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link
      href={`/movies/${movie.id}`}
      className="block rounded-xl border p-4 hover:shadow-sm transition"
    >
      <div className="flex gap-4">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-gray-500">No poster</span>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold truncate">{movie.title}</h3>
          <p className="text-sm text-gray-600">
            {movie.genre} • {movie.duration_minutes} min
          </p>
          {movie.release_year ? (
            <p className="text-xs text-gray-500">Year: {movie.release_year}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
