import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, IBM_Plex_Mono } from "next/font/google";

import { AppProviders } from "@/components/app-providers";

import "./globals.css";

const heading = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-heading",
});

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000"),
  ),
  title: "Plugin Project Manager",
  description:
    "Move work through Plugin teams with readable IDs and file handoffs.",
  applicationName: "Plugin Project Manager",
  openGraph: {
    title: "Plugin Project Manager",
    description:
      "Move work through Plugin teams with readable IDs and file handoffs.",
    siteName: "Plugin Project Manager",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Plugin Project Manager",
    description:
      "Move work through Plugin teams with readable IDs and file handoffs.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
