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
  title: "Open Permit — Civic Permit Intelligence",
  description:
    "Open Permit helps citizens, NGOs, and legal advocates track high-impact permits and draft legally grounded objections.",
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
