import type { Metadata } from "next";
import { Outfit, Raleway } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Landsraad Tracker — stan odbioru nagród",
  description:
    "Nieoficjalne narzędzie dla graczy Dune: Awakening. Po resecie Landsraadu pamiętaj, od którego rodu odebrać nagrodę.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${outfit.variable} ${raleway.variable}`}>
      <body>{children}</body>
    </html>
  );
}
