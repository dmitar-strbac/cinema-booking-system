"use client";

import { useMemo, useState } from "react";

type Props = {
  disabled?: boolean;
  selectedCount: number;
  onSubmit: (payload: { name: string; email: string }) => Promise<void>;
};

export default function ReservationForm({ disabled, selectedCount, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (disabled) return false;
    if (submitting) return false;
    if (selectedCount <= 0) return false;
    if (!name.trim()) return false;
    if (!email.trim()) return false;
    return true;
  }, [disabled, submitting, selectedCount, name, email]);

  return (
    <div className="rounded-xl border p-4">
      <h3 className="font-semibold">Reserve tickets</h3>
      <p className="text-sm text-gray-600 mt-1">
        Selected seats: <span className="font-medium">{selectedCount}</span>
      </p>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm">Name</span>
          <input
            className="rounded-lg border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Email</span>
          <input
            className="rounded-lg border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        {err ? <p className="text-sm text-red-700">{err}</p> : null}

        <button
          className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
          disabled={!canSubmit}
          onClick={async () => {
            setErr(null);
            setSubmitting(true);
            try {
              await onSubmit({ name: name.trim(), email: email.trim() });
              setName("");
              setEmail("");
            } catch (e: any) {
              setErr(e?.message ?? "Failed to reserve.");
            } finally {
              setSubmitting(false);
            }
          }}
          type="button"
        >
          {submitting ? "Reserving..." : "Reserve"}
        </button>
      </div>
    </div>
  );
}
