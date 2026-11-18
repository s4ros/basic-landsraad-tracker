import { cookies } from "next/headers";
import { decode, encode } from "next-auth/jwt";

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export function sessionCookie() {
  const secure = (process.env.AUTH_URL ?? "").startsWith("https://");
  return {
    name: `${secure ? "__Secure-" : ""}authjs.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure,
      maxAge: SESSION_MAX_AGE,
    },
  };
}

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

export function appOrigin() {
  const configured = process.env.AUTH_URL;
  if (!configured) throw new Error("AUTH_URL is not set");
  return new URL(configured).origin;
}

export async function readSessionUserId() {
  const cookie = sessionCookie();
  const raw = (await cookies()).get(cookie.name)?.value;
  if (!raw) return null;
  const token = await decode({ token: raw, secret: authSecret(), salt: cookie.name });
  return typeof token?.userId === "string" ? token.userId : null;
}

export async function sessionCookieValue(userId: string) {
  const cookie = sessionCookie();
  return encode({
    token: { userId },
    secret: authSecret(),
    salt: cookie.name,
    maxAge: SESSION_MAX_AGE,
  });
}
