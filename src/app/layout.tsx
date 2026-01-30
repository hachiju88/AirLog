import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AirLog",
  description: "Next-Gen AI Self-Care App",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AirLog",
  },
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-100 min-h-screen`}
      >
        <div className="max-w-lg md:max-w-2xl mx-auto min-h-screen bg-background shadow-2xl relative">
          {children}
        </div>
        <Toaster position="top-center" toastOptions={{ duration: 5000 }} />
      </body>
    </html>
  );
}
