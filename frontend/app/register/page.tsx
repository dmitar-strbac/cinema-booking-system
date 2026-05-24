"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setTokens } from "@/lib/auth";

type RegisterResponse = {
  access: string;
  refresh: string;
};

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await api<RegisterResponse>("/../auth/register/", {
        method: "POST",
        body: { username, email, password },
      });

      setTokens(res.access, res.refresh);
      router.push("/movies");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell py-14">
      <div className="mx-auto max-w-md">
        <div className="glass-card rounded-[32px] p-8 md:p-10">
          <h1 className="text-4xl font-semibold text-white">Create account</h1>

          <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl bg-white/5 px-4 py-3 text-white"
            />

            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl bg-white/5 px-4 py-3 text-white"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-white/5 px-4 py-3 text-white"
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="cursor-pointer disabled:cursor-not-allowed rounded-full bg-yellow-400 px-5 py-3 text-black"
            >
              {busy ? "Creating..." : "Register"}
            </button>
          </form>

          <p className="mt-6 text-sm text-white/60">
            Already have an account?{" "}
            <Link href="/login" className="text-yellow-300">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}