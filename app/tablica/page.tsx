import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { boardErrorText, canCreateWorld, listWorlds } from "@/lib/board";
import { createWorldAction } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function WorldsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error && params.error in boardErrorText ? boardErrorText[params.error as keyof typeof boardErrorText] : null;
  const session = await auth();
  const [worlds, allowed] = await Promise.all([listWorlds(), canCreateWorld(session?.userId)]);

  return (
    <>
      <a className="skip" href="#tresc">
        Przejdź do treści
      </a>
      <SiteHeader prefix="/" current="tablica" />
      <main id="tresc" className="board-page">
        <div className="board-page-inner narrow">
          <p className="diamond" aria-hidden="true"></p>
          <h1>Tablica</h1>
          <p>Wybierz świat. Każdy świat ma jedną otwartą tablicę pięć na pięć.</p>
          {error ? <p className="notice">{error}</p> : null}
          {worlds.length === 0 ? <p>Nie ma jeszcze żadnego świata.</p> : null}
          <ul className="world-list">
            {worlds.map((world) => (
              <li key={world.id}>
                <a href={`/tablica/${world.id}`}>{world.name}</a>
              </li>
            ))}
          </ul>
          {allowed ? (
            <form className="world-field" action={createWorldAction}>
              <label htmlFor="world-name">Nazwa świata, tak jak w grze</label>
              <input id="world-name" name="name" required maxLength={80} autoComplete="off" />
              <button className="notch" type="submit">
                <span>Dodaj świat</span>
              </button>
            </form>
          ) : (
            <p className="soon-note">
              {session?.userId ? (
                "Nowy świat dodaje właściciel albo edytor."
              ) : (
                <>
                  <a href="/konto">Zaloguj się</a>, żeby dodać świat.
                </>
              )}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
