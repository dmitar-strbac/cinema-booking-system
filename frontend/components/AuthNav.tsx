"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clearTokens, getStoredUsername, isAdmin, isLoggedIn } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";

export default function AuthNav() {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [admin, setAdminState] = useState(false);

  useEffect(() => {
    function syncAuthState() {
      setLoggedIn(isLoggedIn());
      setUsername(getStoredUsername());
      setAdminState(isAdmin());
    }

    syncAuthState();
    window.addEventListener("auth-changed", syncAuthState);
    window.addEventListener("storage", syncAuthState);

    return () => {
      window.removeEventListener("auth-changed", syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    clearTokens();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  if (!loggedIn) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:border-yellow-400/30 hover:text-white"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:border-yellow-400/30 hover:text-white"
      >
        Hi, {username || "user"} ▾
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <Link
            href="/my-tickets"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-4 py-3 text-sm text-white/80 hover:bg-white/8 hover:text-white"
          >
            My Tickets
          </Link>

          {admin ? (
            <Link
              href="/admin/dashboard"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm text-yellow-200 hover:bg-yellow-400/10"
            >
              Admin Dashboard
            </Link>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full cursor-pointer rounded-xl px-4 py-3 text-left text-sm text-rose-200 hover:bg-rose-400/10"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}