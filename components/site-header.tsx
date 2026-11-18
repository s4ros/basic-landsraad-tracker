export function SiteHeader({
  prefix = "",
  current,
}: {
  prefix?: "" | "/";
  current?: "konto" | "tablica";
}) {
  return (
    <header className="top">
      <a className="mark" href={`${prefix}#gora`}>
        <span className="mark-kicker">Dune: Awakening</span>
        <span className="mark-name">Landsraad</span>
      </a>
      <nav className="rail" aria-label="Sekcje strony">
        <a href={`${prefix}#problem`}>Problem</a>
        <a href={`${prefix}#zasada`}>Zasada</a>
        <a href="/tablica" aria-current={current === "tablica" ? "page" : undefined}>
          Tablica
        </a>
        <a href="/konto" aria-current={current === "konto" ? "page" : undefined}>
          Konto
        </a>
      </nav>
    </header>
  );
}
