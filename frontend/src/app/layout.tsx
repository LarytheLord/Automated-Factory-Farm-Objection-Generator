import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AFFOG — Automated Factory Farm Objection Generator",
  description:
    "AI-powered civic-tech platform enabling citizens, NGOs, and legal advocates to generate legally grounded objections against factory farming violations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  noStore();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
