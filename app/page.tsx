import { HouseLegend } from "@/components/house-legend";
import { SiteHeader } from "@/components/site-header";
import { tileStatusText, type TileStatus } from "@/lib/tiles";

const tiles: { name: string; status: TileStatus }[][] = [
  [
    { name: "Imota", status: "idle" },
    { name: "Moritani", status: "idle" },
    { name: "Hurata", status: "collected" },
    { name: "Thorvald", status: "idle" },
    { name: "Alexin", status: "idle" },
  ],
  [
    { name: "Wydras", status: "idle" },
    { name: "Kenola", status: "idle" },
    { name: "Ecaz", status: "ready" },
    { name: "Wallach", status: "idle" },
    { name: "Mutelli", status: "collected" },
  ],
  [
    { name: "Sor", status: "idle" },
    { name: "Dyvetz", status: "idle" },
    { name: "Maros", status: "idle" },
    { name: "Argosaz", status: "idle" },
    { name: "Novebruns", status: "idle" },
  ],
  [
    { name: "Spinnette", status: "idle" },
    { name: "Wayku", status: "ready" },
    { name: "Taligari", status: "idle" },
    { name: "Lindaren", status: "idle" },
    { name: "Vernius", status: "idle" },
  ],
  [
    { name: "Tseida", status: "idle" },
    { name: "Varota", status: "idle" },
    { name: "Richese", status: "collected" },
    { name: "Mikarrol", status: "idle" },
    { name: "Hagal", status: "idle" },
  ],
];

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
              Zalogujesz się przez Steam albo Google. Właściwa tablica jest na stronie{" "}
              <a href="/tablica">Tablica</a>.
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
                Właściciel przełącza kolor rodu ręcznie. Szary, dopóki zadania
                trwają. Złoty, kiedy nagrodę można odebrać. Zielony po odbiorze.
                Nowa sesja nie kasuje starej.
              </p>
              <ul className="facts">
                <li>Dwadzieścia pięć pól. Na każdym jeden ród.</li>
                <li>Układ rodów zmienia się co tydzień.</li>
                <li>Po resecie gra pokazuje już tylko nową tablicę.</li>
              </ul>
            </div>

            <figure className="board">
              <figcaption>
                <span>Przykładowy układ</span>
                <span>To nie jest bieżąca tablica z gry</span>
              </figcaption>
              <div className="board-frame">
                <div className="house-grid">
                  {tiles.flat().map((house) => (
                    <span key={house.name} className={`house-tile ${house.status}`}>
                      {house.name}
                      {tileStatusText[house.status] ? (
                        <span className="sr">, {tileStatusText[house.status]}</span>
                      ) : null}
                    </span>
                  ))}
                </div>
                <HouseLegend />
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
                <h3>Złoty, kiedy nagroda czeka</h3>
                <p>Właściciel przełącza ród na złoty, gdy zadania są zrobione i nagrodę można odebrać.</p>
              </li>
              <li>
                <span className="step-index">03</span>
                <h3>Zielony po odbiorze</h3>
                <p>Po odebraniu nagród ten sam kafelek staje się zielony. Po resecie widać poprzedni układ.</p>
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
