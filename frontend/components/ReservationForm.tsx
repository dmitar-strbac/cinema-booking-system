"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";

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

  const router = useRouter();
  const pathname = usePathname();
  const loggedIn = isLoggedIn();

  const canSubmit = useMemo(() => {
    if (!loggedIn) return selectedCount > 0;
    if (disabled) return false;
    if (submitting) return false;
    if (selectedCount <= 0) return false;
    if (!name.trim()) return false;
    if (!email.trim()) return false;
    return true;
  }, [loggedIn,disabled, submitting, selectedCount, name, email]);

  return (
    <div className="glass-card fade-in-delay rounded-[28px] p-6">
      <h3 className="text-lg font-semibold text-white">Reserve tickets</h3>
      <p className="mt-2 text-sm text-white/60">
        Selected seats: <span className="font-medium text-yellow-200">{selectedCount}</span>
      </p>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm text-white/75">Name</span>
          <input
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-yellow-400/30 focus:bg-white/7"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-white/75">Email</span>
          <input
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-yellow-400/30 focus:bg-white/7"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        {err ? <p className="text-sm text-rose-300">{err}</p> : null}

        <button
          className="cursor-pointer rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
          disabled={!canSubmit}
          onClick={async () => {
            if (!loggedIn) {
              router.push(`/login?next=${encodeURIComponent(pathname)}`);
              return;
            }

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
          {submitting ? "Reserving..." : "Continue to payment"}
        </button>
      </div>
    </div>
  );
}