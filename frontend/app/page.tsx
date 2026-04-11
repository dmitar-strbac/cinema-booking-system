import Link from "next/link";

export default function Home() {
  return (
    <main className="page-shell py-12 md:py-20">
      <section className="hero-glow glass-card fade-in relative overflow-hidden rounded-[32px] px-6 py-10 md:px-10 md:py-14">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.35em] text-yellow-300/80">
            Premium movie experience
          </p>

          <h1 className="cinema-title text-5xl font-semibold text-white md:text-7xl">
            Book cinema tickets with a modern, real-time seat experience.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
            Browse movies, explore screening schedules, select your seats live, and
            complete reservations through a clean cinema-inspired flow built for a
            realistic full-stack project.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/movies"
              className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-6 py-3 text-sm font-semibold text-black shadow-xl shadow-yellow-500/20"
            >
              Browse movies
            </Link>

            <Link
              href="/movies"
              className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/85 hover:border-white/20 hover:bg-white/8"
            >
              Explore screenings
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3">
          {[
            ["Real-time seat map", "Live seat availability with interactive selection."],
            ["Fast reservations", "Smooth booking flow from movie page to payment."],
            ["Scalable backend", "Built around solid reservation logic and APIs."],
          ].map(([title, text], idx) => (
            <div
              key={title}
              className={`glass-card rounded-2xl p-5 ${idx === 0 ? "fade-in-delay" : "fade-in-delay-2"}`}
            >
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}