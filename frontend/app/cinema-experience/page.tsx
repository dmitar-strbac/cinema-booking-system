import Link from "next/link";

const experiences = [
  ["IMAX Hall", "Large-format projection, premium sound, and a bigger cinematic feel."],
  ["VIP Lounge", "Comfort seating, calmer atmosphere, and premium booking experience."],
  ["Dolby-style Audio", "Immersive sound design for action, sci-fi, and drama screenings."],
  ["Snack Combos", "Popcorn, nachos, drinks, and cinema bundles for movie nights."],
];

export default function CinemaExperiencePage() {
  return (
    <main className="page-shell py-10 md:py-14">
      <section className="hero-glow glass-card fade-in rounded-[32px] p-8 md:p-10">
        <p className="text-sm uppercase tracking-[0.35em] text-yellow-300/80">
          Cinema experience
        </p>

        <h1 className="cinema-title mt-4 max-w-4xl text-5xl font-semibold text-white md:text-7xl">
          More than tickets. A full movie night experience.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
          Explore premium halls, comfortable seating, immersive sound, and snack
          options designed to make the booking platform feel like a real cinema brand.
        </p>

        <div className="mt-8">
          <Link
            href="/movies"
            className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-6 py-3 text-sm font-semibold text-black shadow-xl shadow-yellow-500/20"
          >
            Browse movies
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {experiences.map(([title, text], idx) => (
          <div
            key={title}
            className={`glass-card rounded-[28px] p-6 ${
              idx < 2 ? "fade-in-delay" : "fade-in-delay-2"
            }`}
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-2xl">
              {idx === 0 ? "🎥" : idx === 1 ? "⭐" : idx === 2 ? "🔊" : "🍿"}
            </div>
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}