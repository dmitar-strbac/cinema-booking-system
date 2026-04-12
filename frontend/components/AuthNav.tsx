"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearTokens, isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function AuthNav() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  function handleLogout() {
    clearTokens();
    setLoggedIn(false);
    router.push("/");
    router.refresh();
  }

  if (loggedIn) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:border-yellow-400/30 hover:text-white"
      >
        Logout
      </button>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:border-yellow-400/30 hover:text-white"
    >
      Login
    </Link>
  );
}