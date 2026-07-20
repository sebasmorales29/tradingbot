import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PulseTrade — Bot de trading crypto con disciplina",
  description:
    "Automatiza tu operativa en Binance Spot con reglas claras, gestión de riesgo y paper trading antes de capital real. Hecho para operar con método, no con impulso.",
  openGraph: {
    title: "PulseTrade",
    description:
      "Bot de trading crypto: señales, riesgo controlado y panel web.",
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ink text-snow">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
