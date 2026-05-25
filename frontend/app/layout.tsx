import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import Image from "next/image";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cinema Booking System",
  description: "Cinema ticket booking platform with seat reservation and payment flow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`cinema-bg ${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen">
          <header className="sticky top-0 z-30 border-b border-white/8 bg-black/30 backdrop-blur-xl">
            <div className="page-shell flex h-16 items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-yellow-400/20 bg-white/5 shadow-lg shadow-yellow-500/10">
                  <Image
                    src="/logo/cinema-logo.png"
                    alt="Cinema Booking Logo"
                    width={44}
                    height={44}
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <p className="text-sm font-medium tracking-[0.25em] text-white/60 uppercase">
                    Cinema
                  </p>
                  <p className="text-base font-semibold text-white">Booking System</p>
                </div>
              </Link>

              <nav className="flex items-center gap-3 text-sm">
                <Link
                  href="/movies"
                  className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-4 py-2 font-medium text-black shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30"
                >
                  Movies
                </Link>

                <Link
                  href="/cinema-experience"
                  className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:border-yellow-400/30 hover:text-white lg:inline-flex"
                >
                  Experience
                </Link>

                <AuthNav />
              </nav>
            </div>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}