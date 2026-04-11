import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen">
          <header className="sticky top-0 z-30 border-b border-white/8 bg-black/30 backdrop-blur-xl">
            <div className="page-shell flex h-16 items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/20 bg-white/5 text-lg shadow-lg shadow-yellow-500/10">
                  🎬
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
                  href="/"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:border-yellow-400/30 hover:text-white"
                >
                  Home
                </Link>
                <Link
                  href="/movies"
                  className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-4 py-2 font-medium text-black shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30"
                >
                  Browse movies
                </Link>
              </nav>
            </div>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}