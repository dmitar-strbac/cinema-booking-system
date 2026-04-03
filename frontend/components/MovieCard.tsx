import Link from "next/link";
import { Movie } from "@/lib/types";

export default function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link
      href={`/movies/${movie.id}`}
      className="group glass-card block overflow-hidden rounded-[28px]"
    >
      <div className="relative">
        <div className="aspect-[3/4] w-full bg-white/5">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/40">
              No poster
            </div>
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent opacity-90" />
      </div>

      <div className="relative -mt-24 p-5">
        <div className="rounded-[24px] border border-white/10 bg-black/45 p-4 backdrop-blur-md">
          <h3 className="truncate text-lg font-semibold text-white">{movie.title}</h3>
          <p className="mt-2 text-sm text-white/65">
            {movie.genre} • {movie.duration_minutes} min
          </p>

          {movie.release_year ? (
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-yellow-300/75">
              {movie.release_year}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}