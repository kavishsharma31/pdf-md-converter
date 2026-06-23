export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/78 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="font-display text-xl font-bold tracking-tight text-white">
          pdf<span className="px-1 text-accent">{"\u2192"}</span>md
        </div>
        <div className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_0_24px_rgba(124,92,252,0.18)] sm:text-xs sm:tracking-[0.14em]">
          Claude Token Saver
        </div>
      </div>
    </header>
  );
}
