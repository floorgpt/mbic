import { Inter, JetBrains_Mono, Montserrat } from "next/font/google";

export const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-base",
  display: "swap",
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-base",
  display: "swap",
});
