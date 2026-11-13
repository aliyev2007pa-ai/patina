import type { Metadata } from "next";
import GalleryWall from "@/components/GalleryWall";

export const metadata: Metadata = {
  title: "Gallery",
  alternates: { canonical: "/gallery" },
  description:
    "The paintings you have kept, framed and labelled. Stored in your own browser, never uploaded.",
};

/**
 * The gallery.
 *
 * A static page with a client component inside it: the paintings live in this
 * browser's own storage, so there is nothing for a server to render and no
 * reason for this page to be anything but a file on a CDN.
 */
export default function GalleryPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <p className="text-[11px] uppercase tracking-[0.3em] text-turquoise">
        Patina
      </p>
      <h1 className="mt-5 text-balance font-serif text-3xl text-paper sm:text-4xl">
        Your gallery
      </h1>
      <div className="mt-5 h-px w-20 bg-gold" />

      <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
        Kept paintings hang here, in this browser and nowhere else — no
        account, no upload, no server that could lose them. Which also means
        they are only on this machine: download anything you want to keep for
        good.
      </p>

      <div className="mt-12">
        <GalleryWall />
      </div>
    </div>
  );
}
