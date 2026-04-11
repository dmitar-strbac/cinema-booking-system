import { SeatMapSeat } from "@/lib/types";

type Props = {
  seats: SeatMapSeat[];
  selectedIds: Set<number>;
  onToggle: (seatId: number) => void;
};

function seatLabel(s: SeatMapSeat) {
  return `R${s.row}-S${s.number}`;
}

export default function SeatMap({ seats, selectedIds, onToggle }: Props) {
  const maxRow = seats.reduce((m, s) => Math.max(m, s.row), 0);
  const maxNum = seats.reduce((m, s) => Math.max(m, s.number), 0);

  const byPos = new Map<string, SeatMapSeat>();
  for (const s of seats) byPos.set(`${s.row}:${s.number}`, s);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
        <div className="mx-auto mb-5 h-3 w-full max-w-xl rounded-full bg-gradient-to-r from-yellow-400/70 via-amber-200/90 to-yellow-400/70 shadow-[0_0_30px_rgba(246,196,83,0.18)]" />
        <p className="text-center text-xs uppercase tracking-[0.28em] text-white/45">
          Screen
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-white/60">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">available</span>
        <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-yellow-100">held by you</span>
        <span className="rounded-full border border-yellow-300/20 bg-gradient-to-r from-yellow-400 to-amber-300 px-3 py-1 font-medium text-black">selected</span>
        <span className="rounded-full border border-white/8 bg-white/10 px-3 py-1 text-white/40">held/reserved</span>
      </div>

      <div className="overflow-auto rounded-[24px] border border-white/8 bg-black/15 p-4">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${maxNum}, minmax(38px, 38px))` }}
        >
          {Array.from({ length: maxRow }).flatMap((_, rIdx) => {
            const row = rIdx + 1;
            return Array.from({ length: maxNum }).map((_, cIdx) => {
              const number = cIdx + 1;
              const seat = byPos.get(`${row}:${number}`);

              if (!seat) {
                return <div key={`${row}-${number}`} className="h-10 w-10" />;
              }

              const isSelected = selectedIds.has(seat.id);
              const isReserved = seat.is_reserved;
              const isHeldByOther = seat.is_held && !seat.held_by_me;
              const disabled = isReserved || isHeldByOther;

              const base =
                "h-10 w-10 rounded-xl text-[10px] font-medium flex items-center justify-center border transition select-none";
              const cls = disabled
                ? `${base} border-white/8 bg-white/10 text-white/30 cursor-not-allowed`
                : isSelected
                ? `${base} border-yellow-200 bg-gradient-to-r from-yellow-400 to-amber-300 text-black shadow-lg shadow-yellow-500/20 cursor-pointer`
                : seat.is_held && seat.held_by_me
                ? `${base} border-yellow-400/25 bg-yellow-400/10 text-yellow-100 cursor-pointer`
                : `${base} border-white/10 bg-white/5 text-white/80 hover:border-yellow-300/30 hover:bg-white/8 cursor-pointer`;

              return (
                <button
                  key={`${row}-${number}`}
                  className={cls}
                  title={seatLabel(seat)}
                  onClick={() => !disabled && onToggle(seat.id)}
                  type="button"
                >
                  {row}-{number}
                </button>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}