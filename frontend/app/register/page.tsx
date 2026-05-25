"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type RegisterResponse = {
  access: string;
  refresh: string;
   user: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
};

function getRegisterErrorMessage(data: any) {
  if (!data) return "Registration failed. Please try again.";

  const fields = ["first_name", "last_name", "username", "email", "password"];

  for (const field of fields) {
    const value = data[field];

    if (Array.isArray(value) && value.length > 0) {
      return value[0];
    }

    if (typeof value === "string") {
      return value;
    }
  }

  return data.detail || data.message || "Registration failed. Please check your details.";
}

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (!firstName.trim() || !lastName.trim() || !username.trim() || !email.trim() || !password.trim()) {
        setError("Please fill in all fields.");
        setBusy(false);
        return;
      }

      if (!email.includes("@") || !email.includes(".")) {
        setError("Please enter a valid email address.");
        setBusy(false);
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        setBusy(false);
        return;
      }

      const res = await api<RegisterResponse>("/../auth/register/", {
        method: "POST",
        body: { username, first_name: firstName, last_name: lastName, email, password },
      });

      router.push("/login?registered=1");
      router.refresh();
    } catch (e: any) {
      setError(getRegisterErrorMessage(e?.data));
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
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-2xl bg-white/5 px-4 py-3 text-white"
            />

            <input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-2xl bg-white/5 px-4 py-3 text-white"
            />
            
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
              disabled={
                busy ||
                !firstName.trim() ||
                !lastName.trim() ||
                !username.trim() ||
                !email.trim() ||
                !password.trim()
              }
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