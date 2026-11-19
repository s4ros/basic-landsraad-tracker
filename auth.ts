import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { IdentityTaken, findUserId, linkIdentity } from "@/lib/identity";
import { readSessionUserId, sessionCookie, SESSION_MAX_AGE } from "@/lib/session-cookie";

declare module "next-auth" {
  interface Session {
    userId?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
  }
}

function googleProvider() {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return null;
  return Google({ clientId, clientSecret });
}

export function googleConfigured() {
  return googleProvider() !== null;
}

const cookie = sessionCookie();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  cookies: { sessionToken: { name: cookie.name, options: cookie.options } },
  providers: [googleProvider()].filter((provider) => provider !== null),
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !account.providerAccountId) return false;
      try {
        // auth() would re-enter this request. The current user is the session cookie.
        const userId = await linkIdentity({
          provider: "google",
          subject: account.providerAccountId,
          currentUserId: await readSessionUserId(),
          displayName: user.name ?? "",
          email: user.email ?? null,
        });
        (user as { userId?: string }).userId = userId;
        return true;
      } catch (error) {
        if (error instanceof IdentityTaken) return "/konto?error=taken";
        console.error("google sign-in failed", error instanceof Error ? error.name : "unknown");
        return "/konto?error=signin";
      }
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && account.providerAccountId) {
        const attached = (user as { userId?: string } | undefined)?.userId;
        const linked = attached ?? (await findUserId("google", account.providerAccountId));
        if (linked && (typeof token.userId !== "string" || token.userId === linked)) {
          token.userId = linked;
        }
      }
      delete token.name;
      delete token.email;
      delete token.picture;
      delete token.sub;
      return token;
    },
    session({ session, token }) {
      if (typeof token.userId === "string") session.userId = token.userId;
      return session;
    },
  },
});
