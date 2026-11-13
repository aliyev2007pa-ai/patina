import type { Metadata } from "next";
import Button from "@/components/Button";
import GoldFrame from "@/components/GoldFrame";
import Plaque from "@/components/Plaque";
import SampleArtwork from "@/components/SampleArtwork";

// Title and description come from the root layout; only the canonical is
// this page's own, since every page now states its own address.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Landing page — a dark gallery wall with one painting hanging on it.
 *
 * The two selling points are stated plainly, because they are unusual and
 * true: the work happens in the browser, so it is unlimited and free, and the
 * photograph is never uploaded anywhere (PROJECT.md 1.1).
 */
const points = [
  {
    title: "Unlimited and free",
    body: "Every painting is rendered by your own graphics card. No quotas, no queue, no account needed, no cost — now or later.",
  },
  {
    title: "Your photo never leaves your device",
    body: "There is no upload. The file is read in the browser and stays there. Nothing reaches a server unless you choose to save a painting to your gallery.",
  },
  {
    title: "Five old master styles",
    body: "Ottoman Court, Rembrandt, Renaissance, Baroque and Aged Canvas — each a different brush, palette and light. Then tune every slider yourself.",
  },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div className="text-center lg:text-left">
          <p className="text-[11px] uppercase tracking-[0.3em] text-turquoise">
            Runs entirely in your browser
          </p>

          <h1 className="mt-5 text-balance font-serif text-3xl leading-[1.1] text-paper sm:text-5xl lg:text-6xl">
            Turn your photos into
            <span className="block text-white">old master oil paintings</span>
          </h1>

          <div className="mx-auto mt-6 h-px w-20 bg-gold lg:mx-0" />

          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted lg:mx-0">
            Patina repaints a photograph the way a 19th-century painter would
            have: brush strokes that follow the contours of a face, thick paint
            catching the light, warm varnish and a woven canvas underneath.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button href="/studio" size="lg">
              Start painting
            </Button>
            <Button href="/about" variant="ghost" size="lg">
              How it works
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted">
            No account, no upload, no watermark.
          </p>
        </div>

        <figure className="mx-auto w-full max-w-sm">
          <GoldFrame>
            <SampleArtwork className="block w-full" />
          </GoldFrame>
          <Plaque
            title="Portrait of a Stranger"
            style="Ottoman Court"
            date="Example"
          />
        </figure>
      </section>

      <section className="border-t border-white/10 bg-surface/40">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:py-20">
          {points.map((point) => (
            <div key={point.title}>
              <h2 className="text-balance font-serif text-2xl text-paper">{point.title}</h2>
              <div className="mt-3 h-px w-10 bg-gold-d" />
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {point.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
