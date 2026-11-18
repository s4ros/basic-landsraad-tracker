import { SiteHeader } from "@/components/site-header";

const rows = ["I", "II", "III", "IV", "V"] as const;

const houses = [
  { name: "Atreides", pending: false },
  { name: "Harkonnen", pending: false },
  { name: "Corrino", pending: true },
  { name: "Ecaz", pending: false },
  { name: "Richese", pending: false },
] as const;

export default function HomePage() {
  return (
    <>
      <a className="skip" href="#tresc">
        Przejdź do treści
      </a>

      <SiteHeader />

      <main id="tresc">
        <section className="hero" id="gora">
          <div className="hero-glow" aria-hidden="true"></div>
          <svg className="hero-arcs" viewBox="0 0 1200 800" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="980" cy="460" r="180" />
              <circle cx="980" cy="460" r="320" />
              <circle cx="980" cy="460" r="480" />
            </g>
          </svg>

          <div className="hero-copy">
            <p className="eyebrow">Co tydzień, nowa sesja</p>
            <h1>
              Po resecie nie widać,
              <br />
              od którego rodu
              <br />
              odebrać nagrodę
            </h1>
            <p className="lede">
              Landsraad publikuje tablicę pięć na pięć. Kolejność rodów jest losowa.
              Gdy tydzień się kończy, tablica znika, a nagrody zostają u rodów, dla
              których pracowałeś.
            </p>
            <div className="hero-actions">
              <a className="notch" href="#zasada">
                <span>Jak to ma działać</span>
              </a>
              <a className="ghost" href="#problem">
                Zobacz problem
              </a>
            </div>
            <p className="soon-note">
              Zalogujesz się przez Steam albo Google. Tablica jeszcze nie zapisuje zadań.
            </p>
          </div>
        </section>

        <section className="band" id="problem">
          <div className="band-inner split">
            <div className="prose">
              <p className="diamond" aria-hidden="true"></p>
              <h2>Tablica znika. Nagrody nie.</h2>
              <p>
                W trakcie tygodnia wiesz, które zadania robisz i u którego rodu
                stoisz w kolejce po odbiór. Po publikacji nowej tablicy zostaje
                tylko pamięć.
              </p>
              <p>
                Tracker ma trzymać poprzedni układ rodów i stan odbioru: nagroda
                odebrana albo nadal czeka. Nowa sesja nie kasuje starej.
              </p>
              <ul className="facts">
                <li>Pięć rzędów zadań, pięć kolumn rodów.</li>
                <li>Kolejność rodów zmienia się co tydzień.</li>
                <li>Po resecie gra pokazuje już tylko nową tablicę.</li>
              </ul>
            </div>

            <figure className="board">
              <figcaption>
                <span>Przykładowy układ</span>
                <span>To nie jest bieżąca tablica z gry</span>
              </figcaption>
              <div className="board-frame">
                <div className="board-head">
                  <span></span>
                  {houses.map((house) => (
                    <span key={house.name} className={house.pending ? "pending" : undefined}>
                      {house.name}
                    </span>
                  ))}
                </div>
                <div className="board-body">
                  {rows.map((row) => (
                    <div className="board-row" key={row}>
                      <span className="row-label">{row}</span>
                      {houses.map((house) => (
                        <span
                          key={house.name}
                          className={house.pending ? "cell pending" : undefined}
                        ></span>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="board-status">
                  <span className="status-mark" aria-hidden="true"></span>
                  Corrino — nagroda nieodebrana z zeszłego tygodnia
                </p>
              </div>
            </figure>
          </div>
        </section>

        <section className="band band-deep" id="zasada">
          <div className="band-inner">
            <div className="section-lead">
              <p className="diamond" aria-hidden="true"></p>
              <h2>Trzy rzeczy, które mają zostać po resecie</h2>
            </div>
            <ol className="steps">
              <li>
                <span className="step-index">01</span>
                <h3>Układ tygodnia</h3>
                <p>Rody w kolejności z tablicy, nie alfabetycznie. Następny tydzień dostaje własny układ.</p>
              </li>
              <li>
                <span className="step-index">02</span>
                <h3>Rody, u których pracowałeś</h3>
                <p>Oznaczasz rody, dla których robiłeś zadania. To twój stan, nie wspólna lista graczy.</p>
              </li>
              <li>
                <span className="step-index">03</span>
                <h3>Odbiór, który da się odhaczyć</h3>
                <p>Po resecie widać poprzednią sesję i rody, od których nagroda nadal czeka.</p>
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="colophon">
        <p>
          Landsraad Tracker jest nieoficjalnym narzędziem fanowskim. Nie jest
          powiązany z Funcom, Legendary ani właścicielami marki Dune.
          Dune: Awakening należy do odpowiednich właścicieli znaków towarowych.
        </p>
        <p className="colophon-meta">Tablica na tej stronie jest przykładem. Logowanie jest na stronie konta.</p>
      </footer>
    </>
  );
}
