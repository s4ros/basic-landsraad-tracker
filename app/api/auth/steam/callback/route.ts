import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { IdentityTaken, linkIdentity } from "@/lib/identity";
import { appOrigin, readSessionUserId, sessionCookie, sessionCookieValue } from "@/lib/session-cookie";

export const runtime = "nodejs";

const stateCookie = "landsraad.steam-state";
const claimedIdPattern = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;

function sameState(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function redirectToAccount(origin: string, error?: "steam" | "taken" | "signin") {
  const target = new URL(error ? `/konto?error=${error}` : "/konto", origin);
  const response = NextResponse.redirect(target);
  response.cookies.set(stateCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth/steam/callback",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const origin = appOrigin();
  const url = new URL(request.url);
  const mode = url.searchParams.get("openid.mode");
  const claimed = url.searchParams.get("openid.claimed_id");
  const identity = url.searchParams.get("openid.identity");
  const returnTo = url.searchParams.get("openid.return_to");
  const state = url.searchParams.get("state");
  const expected = (await cookies()).get(stateCookie)?.value;
  const steamId = claimed ? claimedIdPattern.exec(claimed)?.[1] : undefined;

  let returnUrl: URL | undefined;
  try {
    if (returnTo) returnUrl = new URL(returnTo);
  } catch {
    returnUrl = undefined;
  }

  const stateMatches = Boolean(state && expected && sameState(state, expected));
  const returnMatches =
    returnUrl?.origin === origin &&
    returnUrl.pathname === "/api/auth/steam/callback" &&
    returnUrl.searchParams.get("state") === state;

  if (mode !== "id_res" || !claimed || claimed !== identity || !steamId || !returnMatches || !stateMatches) {
    return redirectToAccount(origin, "steam");
  }

  const body = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (key.startsWith("openid.")) body.set(key, value);
  }
  body.set("openid.mode", "check_authentication");

  try {
    const steam = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    const steamBody = steam.status === 200 ? await steam.text() : "";
    const valid = steamBody.split(/\r?\n/).some((line) => line.trim() === "is_valid:true");
    if (!valid) return redirectToAccount(origin, "steam");
  } catch (error) {
    console.error("steam check failed", error instanceof Error ? error.name : "unknown");
    return redirectToAccount(origin, "steam");
  }

  try {
    const userId = await linkIdentity({
      provider: "steam",
      subject: steamId,
      currentUserId: await readSessionUserId(),
    });
    const response = redirectToAccount(origin);
    const cookie = sessionCookie();
    response.cookies.set(cookie.name, await sessionCookieValue(userId), cookie.options);
    return response;
  } catch (error) {
    if (!(error instanceof IdentityTaken)) {
      console.error("steam sign-in failed", error instanceof Error ? error.name : "unknown");
    }
    return redirectToAccount(origin, error instanceof IdentityTaken ? "taken" : "signin");
  }
}
