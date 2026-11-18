import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/session-cookie";

export const runtime = "nodejs";

const stateCookie = "landsraad.steam-state";

export function GET() {
  const origin = appOrigin();
  const state = randomBytes(16).toString("hex");
  const returnTo = new URL("/api/auth/steam/callback", origin);
  returnTo.searchParams.set("state", state);

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo.toString(),
    "openid.realm": origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  const response = NextResponse.redirect(`https://steamcommunity.com/openid/login?${params}`);
  response.cookies.set(stateCookie, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth/steam/callback",
    secure: origin.startsWith("https://"),
    maxAge: 10 * 60,
  });
  return response;
}
