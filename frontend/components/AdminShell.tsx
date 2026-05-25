"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
  },
  {
    href: "/admin/movies",
    label: "Movies",
  },
  {
    href: "/admin/screenings",
    label: "Screenings",
  },
  {
    href: "/admin/reservations",
    label: "Reservations",
  },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="page-shell py-8 md:py-12">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="glass-card h-fit rounded-[28px] p-4">
          <p className="px-3 py-2 text-xs uppercase tracking-[0.25em] text-yellow-300/70">
            Admin
          </p>

          <nav className="mt-2 grid gap-2 text-sm">
            {links.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-2xl px-4 py-3 transition-all ${
                    active
                      ? "bg-gradient-to-r from-yellow-400 to-amber-300 font-medium text-black shadow-lg shadow-yellow-500/20"
                      : "text-white/75 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section>{children}</section>
      </div>
    </main>
  );
}