import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  tagline?: string;
}

/** Contenedor visual premium: oscuro + acentos dorados (WebElite SOLUTIONS). */
export function WebEliteShell({ children, tagline }: Props) {
  return (
    <div className="webelite-page relative min-h-screen overflow-hidden bg-[#0a0a0b] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,160,76,0.18),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-[#D4A04C]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#D4A04C]/5 blur-3xl"
      />

      <header className="relative z-10 border-b border-white/5 px-6 py-5">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#D4A04C]">
              WebElite
            </p>
            <p className="font-display text-lg font-bold tracking-tight text-white">
              SOLUTIONS
            </p>
          </div>
          {tagline ? (
            <p className="max-w-[140px] text-right text-[11px] leading-snug text-zinc-500">
              {tagline}
            </p>
          ) : null}
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-lg px-6 py-10">
        {children}
      </main>

      <footer className="relative z-10 pb-8 text-center text-[10px] uppercase tracking-widest text-zinc-600">
        MascotPoints · Fidelización premium
      </footer>
    </div>
  );
}
