"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { setTokens } from "@/lib/auth";

type LoginResponse = {
  access: string;
  refresh: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextUrl = searchParams.get("next") || "/";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await api<LoginResponse>("/../auth/login/", {
        method: "POST",
        body: {
          username,
          password,
        },
      });

      setTokens(res.access, res.refresh, username);
      router.push(nextUrl);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell py-14">
      <div className="mx-auto max-w-md">
        <div className="glass-card fade-in rounded-[32px] p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-yellow-300/80">
            Account
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Log in</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Sign in to access authenticated features and admin tools.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/75">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-400/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/75">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-400/30"
              />
            </div>

            {error ? (
              <p className="text-sm text-rose-300">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={busy || !username.trim() || !password.trim()}
              className="cursor-pointer disabled:cursor-not-allowed rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
            >
              {busy ? "Signing in..." : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-white/60">
            Don’t have an account?{" "}
            <Link href="/register" className="text-yellow-300">
              Register
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}