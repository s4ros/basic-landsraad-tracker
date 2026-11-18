import { auth, googleConfigured } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { accountSummary } from "@/lib/identity";
import { signInWithGoogle, signOutAccount } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const errors: Record<string, string> = {
  taken: "To konto jest już połączone z innym użytkownikiem.",
  steam: "Steam nie potwierdził logowania.",
  signin: "Logowanie nie powiodło się.",
};

function providerLabel(provider: string) {
  if (provider === "steam") return "Steam";
  if (provider === "google") return "Google";
  return provider;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? (errors[params.error] ?? "Logowanie nie powiodło się.") : null;
  const session = await auth();
  const summary = session?.userId ? await accountSummary(session.userId) : null;
  const googleReady = googleConfigured();
  const providers = summary?.providers ?? [];

  return (
    <>
      <a className="skip" href="#tresc">
        Przejdź do treści
      </a>
      <SiteHeader prefix="/" current="konto" />
      <main id="tresc" className="account">
        <div className="account-panel">
          <p className="diamond" aria-hidden="true"></p>
          <h1>Konto</h1>
          {error ? <p className="notice">{error}</p> : null}
          {summary ? (
            <>
              {summary.isOwner ? <p>To konto jest właścicielem aplikacji.</p> : null}
              <h2>Połączone logowania</h2>
              <ul className="identity-list">
                {providers.map((provider) => (
                  <li key={provider}>{providerLabel(provider)}</li>
                ))}
              </ul>
              <p className="soon-note">
                Właściwa tablica jest na stronie <a href="/tablica">Tablica</a>.
              </p>
              <div className="account-actions">
                {providers.includes("steam") ? null : (
                  <a className="ghost" href="/api/auth/steam/start">
                    Połącz Steam
                  </a>
                )}
                {providers.includes("google") || !googleReady ? null : (
                  <form action={signInWithGoogle}>
                    <button className="ghost" type="submit">
                      Połącz Google
                    </button>
                  </form>
                )}
                <form action={signOutAccount}>
                  <button className="ghost" type="submit">
                    Wyloguj
                  </button>
                </form>
              </div>
              {providers.includes("google") || googleReady ? null : (
                <p className="soon-note">Google nie jest jeszcze skonfigurowany.</p>
              )}
            </>
          ) : (
            <>
              <p>
                Zaloguj się przez Steam albo Google. Jedno konto może mieć oba logowania.
                Właściwa tablica jest na stronie <a href="/tablica">Tablica</a>.
              </p>
              <div className="account-actions">
                <a className="notch" href="/api/auth/steam/start">
                  <span>Zaloguj przez Steam</span>
                </a>
                {googleReady ? (
                  <form action={signInWithGoogle}>
                    <button className="ghost" type="submit">
                      Zaloguj przez Google
                    </button>
                  </form>
                ) : null}
              </div>
              {googleReady ? null : <p className="soon-note">Google nie jest jeszcze skonfigurowany.</p>}
            </>
          )}
        </div>
      </main>
    </>
  );
}
