import Link from "next/link";
import { Screening } from "@/lib/types";

function formatDT(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScreeningList({ screenings }: { screenings: Screening[] }) {
  if (!screenings.length) {
    return <p className="text-sm text-gray-600">No screenings found.</p>;
  }

  return (
    <div className="space-y-2">
      {screenings.map((s) => (
        <Link
          key={s.id}
          href={`/screenings/${s.id}/seats`}
          className="block rounded-xl border p-4 hover:shadow-sm transition"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium">
                {formatDT(s.start_time)} → {formatDT(s.end_time)}
              </p>
              <p className="text-sm text-gray-600">
                Hall: {s.hall?.name} • Lang: {s.language} • {s.is_3d ? "3D" : "2D"}
              </p>
            </div>
            <div className="text-sm text-gray-700 shrink-0">
              {s.base_price} RSD
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
