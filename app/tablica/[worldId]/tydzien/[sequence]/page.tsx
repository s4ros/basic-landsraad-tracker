import { notFound, redirect } from "next/navigation";
import { HouseLegend } from "@/components/house-legend";
import { HouseMark } from "@/components/house-mark";
import { SiteHeader } from "@/components/site-header";
import { loadClosedWeek } from "@/lib/board";
import { tileStatusText } from "@/lib/tiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ClosedWeekPage({
  params,
}: {
  params: Promise<{ worldId: string; sequence: string }>;
}) {
  const { worldId, sequence } = await params;
  if (!/^[1-9][0-9]*$/.test(sequence)) notFound();

  const board = await loadClosedWeek(worldId, Number(sequence));
  if (board === "missing") notFound();
  if (board === "open") redirect(`/tablica/${worldId}`);

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
            {" · "}
            <a href={`/tablica/${board.worldId}`}>Otwarta tablica</a>
          </p>
          <h1>{board.worldName}</h1>
          <p>Tydzień {board.sequence}. Tablica zamknięta. Układu i kolorów nie zmienisz.</p>
          <figure className="board">
            <div className="board-frame">
              <div className="house-grid">
                {board.cells.map((cell) => {
                  const label = `Wiersz ${cell.row}, kolumna ${cell.column}`;
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
                })}
              </div>
              <HouseLegend />
            </div>
          </figure>
        </div>
      </main>
    </>
  );
}
