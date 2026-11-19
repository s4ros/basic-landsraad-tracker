import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { HouseLegend } from "@/components/house-legend";
import { SiteHeader } from "@/components/site-header";
import { boardErrorText, canEditWorld, listClosedWeeks, listHouses, loadOpenBoard } from "@/lib/board";
import { tileStatusText } from "@/lib/tiles";
import { closeWeekAction, cycleTileAction, savePlacementsAction } from "../actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function WorldBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ worldId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { worldId } = await params;
  const query = await searchParams;
  const board = await loadOpenBoard(worldId);
  if (board === "missing") notFound();

  const error =
    query.error && query.error in boardErrorText ? boardErrorText[query.error as keyof typeof boardErrorText] : null;
  const session = await auth();
  const canEdit = board !== "closed" && (await canEditWorld(session?.userId, worldId));
  const houses = board !== "closed" && canEdit ? await listHouses() : [];
  const closedWeeks = board === "closed" ? [] : await listClosedWeeks(worldId);

  return (
    <>
      <a className="skip" href="#tresc">
        Przejdź do treści
      </a>
      <SiteHeader prefix="/" current="tablica" />
      <main id="tresc" className="board-page">
        <div className="board-page-inner">
          <p className="diamond" aria-hidden="true"></p>
          <p className="back-link">
            <a href="/tablica">Wszystkie światy</a>
          </p>
          {error ? <p className="notice">{error}</p> : null}
          {board === "closed" ? (
            <>
              <h1>Tablica zamknięta</h1>
              <p>Ten świat nie ma otwartego tygodnia.</p>
            </>
          ) : (
            <>
              <h1>{board.worldName}</h1>
              <p>Tydzień {board.sequence}. Wspólna tablica. Kolor widzą wszyscy.</p>
              {closedWeeks.length > 0 ? (
                <ul className="world-list">
                  {closedWeeks.map((week) => (
                    <li key={week.sequence}>
                      <a href={`/tablica/${board.worldId}/tydzien/${week.sequence}`}>Tydzień {week.sequence}</a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {canEdit ? <p>Kliknij ród, żeby zmienić kolor: szary, złoty, potem zielony.</p> : null}
              <figure className="board">
                <div className="board-frame">
                  <div className="house-grid">
                    {board.cells.map((cell) => {
                      const label = `Wiersz ${cell.row}, kolumna ${cell.column}`;
                      if (!cell.houseName || !canEdit) {
                        return (
                          <span key={label} className={`house-tile ${cell.houseName ? cell.status : "idle"}`}>
                            {cell.houseName}
                            <span className="sr">
                              {cell.houseName
                                ? `${label}${tileStatusText[cell.status] ? `, ${tileStatusText[cell.status]}` : ""}`
                                : `${label}, puste pole`}
                            </span>
                          </span>
                        );
                      }
                      return (
                        <form key={label} className="tile-form" action={cycleTileAction}>
                          <input type="hidden" name="worldId" value={board.worldId} />
                          <input type="hidden" name="row" value={cell.row} />
                          <input type="hidden" name="column" value={cell.column} />
                          <button type="submit" className={`house-tile ${cell.status}`}>
                            {cell.houseName}
                            <span className="sr">
                              {label}
                              {tileStatusText[cell.status] ? `, ${tileStatusText[cell.status]}` : ""}. Kliknij, aby
                              zmienić kolor.
                            </span>
                          </button>
                        </form>
                      );
                    })}
                  </div>
                  <HouseLegend />
                </div>
              </figure>
              {canEdit ? (
                <form className="place-board" action={closeWeekAction}>
                  <h2>Zamknij tydzień</h2>
                  <p>Robisz to przy resecie w grze. Ta tablica zostaje do wglądu, a kolejna startuje pusta.</p>
                  <input type="hidden" name="worldId" value={board.worldId} />
                  <label>
                    <input type="checkbox" name="confirm" value="yes" required /> Zamykam ten tydzień. Układu i kolorów nie da się już zmienić.
                  </label>
                  <button className="notch" type="submit">
                    <span>Zamknij tydzień</span>
                  </button>
                </form>
              ) : null}
              {canEdit ? (
                <form className="place-board" action={savePlacementsAction}>
                  <h2>Ułóż rody</h2>
                  <p>Puste pole zostaje szare. Zapisanie innego rodu na polu wraca do szarego.</p>
                  <input type="hidden" name="worldId" value={board.worldId} />
                  <div className="place-list">
                    {board.cells.map((cell) => {
                      const field = `r${cell.row}c${cell.column}`;
                      const label = `Wiersz ${cell.row}, kolumna ${cell.column}`;
                      return (
                        <label key={field} htmlFor={field}>
                          {label}
                          <select id={field} name={field} defaultValue={cell.houseId === null ? "" : String(cell.houseId)}>
                            <option value="">Puste</option>
                            {houses.map((house) => (
                              <option key={house.id} value={house.id}>
                                {house.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                  <button className="notch" type="submit">
                    <span>Zapisz układ</span>
                  </button>
                </form>
              ) : null}
            </>
          )}
        </div>
      </main>
    </>
  );
}
