import Link from "next/link";
import { Screening } from "@/lib/types";

function formatScreeningDate(startIso: string) {
  const d = new Date(startIso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatScreeningTimeRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  return `${start.toLocaleTimeString(undefined, timeOptions)} → ${end.toLocaleTimeString(undefined, timeOptions)}`;
}

export default function ScreeningList({ screenings }: { screenings: Screening[] }) {
  if (!screenings.length) {
    return (
      <div className="glass-card rounded-[24px] p-5">
        <p className="text-sm text-white/60">No screenings found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {screenings.map((s) => (
        <Link
          key={s.id}
          href={`/screenings/${s.id}/seats`}
          className="glass-card group block rounded-[24px] p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-base font-semibold text-white group-hover:text-yellow-200">
                {formatScreeningDate(s.start_time)} • {formatScreeningTimeRange(s.start_time, s.end_time)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                Hall: {s.hall?.name} • Lang: {s.language} • {s.is_3d ? "3D" : "2D"}
              </p>
            </div>

            <div className="shrink-0 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm font-medium text-yellow-100">
              {s.base_price} RSD
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}