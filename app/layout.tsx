import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "Audiff — Seamless A/B Audio Comparison",
    description: "Compare two local audio files at the exact same timestamp with one synchronized player.",
    openGraph: {
      title: "Audiff — Hear the difference",
      description: "Seamless, private A/B audio comparison in your browser.",
      images: [{ url: imageUrl, width: 1734, height: 907, alt: "Audiff A/B audio comparison" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Audiff — Hear the difference",
      description: "Seamless, private A/B audio comparison in your browser.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={geistMono.variable}>{children}</body>
    </html>
  );
}
