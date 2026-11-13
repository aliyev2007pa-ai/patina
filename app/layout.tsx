import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";

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

/**
 * `metadataBase` is what turns the relative paths Next generates — the
 * Open Graph image above all — into the absolute URLs a crawler on another
 * site needs. Without it those previews quietly come out blank.
 *
 * `title.template` means every page writes its own name and gets the site's
 * for free, so no page has to remember to append "— Patina".
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "oil painting filter",
    "photo to painting",
    "old master",
    "browser",
    "no upload",
    "free",
  ],
  // No canonical here on purpose. A canonical in the root layout is
  // inherited by every page, so each one would announce itself as a copy of
  // the home page — which is exactly what a canonical link is for telling
  // a search engine. Each page sets its own.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  // Every surface on this site is dark by design; letting a browser decide
  // otherwise would have it fighting the palette rather than following it.
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ink font-sans text-white">
        {/* Hidden until it is focused, which is the first thing Tab reaches.
            Without it, anyone on a keyboard has to walk the whole header on
            every page before arriving at what they came for. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-sm focus:bg-turquoise focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
        >
          Skip to content
        </a>
        <Header />
        <main id="content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
