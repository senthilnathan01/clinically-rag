import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { siteConfig } from "@/lib/config/site";

import "./globals.css";

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"]
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${serif.variable} ${sans.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
