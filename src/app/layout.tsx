import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { StorageProvider } from "@/components/storage-provider";
import { OneSignalProvider } from "@/components/providers/onesignal-provider";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Flight Crew",
  description: "A dedicated web application for Flight Crew.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", inter.variable)}>
      <body className="min-h-full flex flex-col">
        <OneSignalProvider>
          <StorageProvider />
          {children}
        </OneSignalProvider>
      </body>
    </html>
  );
}
