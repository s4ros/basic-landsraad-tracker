"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/konto" });
}

export async function signOutAccount() {
  await signOut({ redirectTo: "/konto" });
}
