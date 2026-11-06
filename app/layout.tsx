import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Patina — Turn your photos into old master oil paintings",
  description:
    "Patina turns your photos into 19th-century oil paintings, entirely in your browser. Your photo never leaves your device.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
