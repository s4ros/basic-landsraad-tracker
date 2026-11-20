import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { HouseLegend } from "@/components/house-legend";
import { HouseMark } from "@/components/house-mark";
import { HousePicker } from "@/components/house-picker";
import { SiteHeader } from "@/components/site-header";
import { boardErrorText, canEditWorld, listClosedWeeks, listHouses, loadOpenBoard } from "@/lib/board";
import { tileStatusText } from "@/lib/tiles";
import { clearHouseAction, closeWeekAction, cycleTileAction } from "../actions";

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
  const placedHouseIds = new Set(
    board === "closed" ? [] : board.cells.flatMap((cell) => (cell.houseId === null ? [] : [cell.houseId])),
  );
  const freeHouses = houses.filter((house) => !placedHouseIds.has(house.id));
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
              {canEdit ? (
                <p>Kliknij puste pole, żeby wybrać ród. Kliknij ród, żeby zmienić kolor: szary, złoty, potem zielony.</p>
              ) : null}
              <figure className="board">
                <div className="board-frame">
                  <div className="house-grid">
                    {board.cells.map((cell) => {
                      const label = `Wiersz ${cell.row}, kolumna ${cell.column}`;
                      if (!canEdit) {
                        return (
                          <span key={label} className={`house-tile ${cell.houseName ? cell.status : "idle"}`}>
                            {cell.houseName ? <HouseMark name={cell.houseName} /> : null}
                            {cell.houseName}
                            <span className="sr">
                              {cell.houseName
                                ? `${label}${tileStatusText[cell.status] ? `, ${tileStatusText[cell.status]}` : ""}`
                                : `${label}, puste pole`}
                            </span>
                          </span>
                        );
                      }
                      if (!cell.houseName) {
                        return (
                          <HousePicker
                            key={label}
                            worldId={board.worldId}
                            row={cell.row}
                            column={cell.column}
                            label={label}
                            houses={freeHouses}
                          />
                        );
                      }
                      return (
                        <div key={label} className="tile-cell">
                          <form className="tile-form" action={cycleTileAction}>
                            <input type="hidden" name="worldId" value={board.worldId} />
                            <input type="hidden" name="row" value={cell.row} />
                            <input type="hidden" name="column" value={cell.column} />
                            <button type="submit" className={`house-tile ${cell.status}`}>
                              <HouseMark name={cell.houseName} />
                              {cell.houseName}
                              <span className="sr">
                                {label}
                                {tileStatusText[cell.status] ? `, ${tileStatusText[cell.status]}` : ""}. Kliknij, aby
                                zmienić kolor.
                              </span>
                            </button>
                          </form>
                          <form action={clearHouseAction}>
                            <input type="hidden" name="worldId" value={board.worldId} />
                            <input type="hidden" name="row" value={cell.row} />
                            <input type="hidden" name="column" value={cell.column} />
                            <button type="submit" className="tile-clear">
                              Zdejmij ród
                            </button>
                          </form>
                        </div>
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

            </>
          )}
        </div>
      </main>
    </>
  );
}
