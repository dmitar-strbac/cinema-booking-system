"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearTokens, getStoredUsername, isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function AuthNav() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    function syncAuthState() {
      setLoggedIn(isLoggedIn());
      setUsername(getStoredUsername());
    }

    syncAuthState();

    window.addEventListener("auth-changed", syncAuthState);
    window.addEventListener("storage", syncAuthState);

    return () => {
      window.removeEventListener("auth-changed", syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

  function handleLogout() {
    clearTokens();
    router.push("/");
    router.refresh();
  }

  if (loggedIn) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 md:inline-flex">
          Hi, {username || "user"}
        </span>

        <button
          type="button"
          onClick={handleLogout}
          className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:border-yellow-400/30 hover:text-white"
        >
          Logout
        </button>
      </div>
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