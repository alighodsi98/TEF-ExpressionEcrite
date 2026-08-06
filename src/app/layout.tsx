import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = localFont({
  src: [
    { path: "../fonts/Geist-Latin.woff2", weight: "100 900" },
    { path: "../fonts/Geist-LatinExt.woff2", weight: "100 900" },
  ],
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: [
    { path: "../fonts/GeistMono-Latin.woff2", weight: "100 900" },
    { path: "../fonts/GeistMono-LatinExt.woff2", weight: "100 900" },
  ],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "TEF Canada — Expression Écrite",
  description:
    "Environnement d'entraînement intelligent pour l'écriture du TEF Canada : positionnement, correction quadruple par l'IA et entraînement ciblé.",
  keywords: ["TEF Canada", "Expression écrite", "NCLC", "CECR", "French writing", "Entraînement écriture"],
  authors: [{ name: "TEF Practice" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
