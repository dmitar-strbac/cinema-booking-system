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
    <div className="space-y-2">
      <div className="text-xs text-gray-600">
        <span className="font-medium">Legend:</span>{" "}
        <span>available</span> • <span>selected</span> • <span>held</span> • <span>reserved</span>
      </div>

      <div className="inline-block rounded-xl border p-3 overflow-auto max-w-full">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${maxNum}, minmax(36px, 36px))` }}>
          {Array.from({ length: maxRow }).flatMap((_, rIdx) => {
            const row = rIdx + 1;
            return Array.from({ length: maxNum }).map((_, cIdx) => {
              const number = cIdx + 1;
              const seat = byPos.get(`${row}:${number}`);

              if (!seat) {
                return <div key={`${row}-${number}`} className="h-9 w-9" />;
              }

              const isSelected = selectedIds.has(seat.id);
              const isReserved = seat.is_reserved;
              const isHeldByOther = seat.is_held && !seat.held_by_me;
              const disabled = isReserved || isHeldByOther;

              const base =
                "h-9 w-9 rounded-md text-[10px] flex items-center justify-center border transition select-none";
              const cls = disabled
                ? `${base} bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed`
                : isSelected
                ? `${base} bg-black text-white border-black cursor-pointer`
                : seat.is_held && seat.held_by_me
                ? `${base} bg-yellow-100 text-yellow-900 border-yellow-200 cursor-pointer`
                : `${base} bg-white text-gray-800 border-gray-200 hover:shadow-sm cursor-pointer`;

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
