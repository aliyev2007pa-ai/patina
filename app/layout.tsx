import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Cormorant Garamond carries the museum feeling: logo, headings, plaques.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

// Inter is the workhorse: every piece of interface text and every button.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Patina — Turn your photos into old master oil paintings",
  description:
    "Patina turns your photos into 19th-century oil paintings, entirely in your browser. Your photo never leaves your device.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ink font-sans text-white">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
