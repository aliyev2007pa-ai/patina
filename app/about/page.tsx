import type { Metadata } from "next";
import Button from "@/components/Button";

export const metadata: Metadata = {
  title: "About — Patina",
  description:
    "How Patina repaints a photograph in your browser, why it is free, and why your photo never leaves your device.",
};

/** The nine steps the engine will run, in the order it runs them. */
const pipeline = [
  {
    step: "Read and normalise",
    body: "The photograph is read straight from your disk, turned the right way up using its EXIF orientation, and scaled so its long edge is at most 2048 pixels.",
  },
  {
    step: "Quiet the noise",
    body: "A gentle blur removes JPEG grain, so compression artefacts are not mistaken for brush strokes in the next step.",
  },
  {
    step: "Lay the brush strokes",
    body: "An anisotropic Kuwahara filter flattens the image into strokes that follow the direction of the detail underneath, the way a painter's hand follows a cheekbone. This is the step that decides whether the result looks painted or merely filtered.",
  },
  {
    step: "Thicken the paint",
    body: "Brightness becomes a height map, the height map becomes surface normals, and a light from the upper left catches the ridges. The paint appears to stand off the canvas.",
  },
  {
    step: "Age the colour",
    body: "Saturation drops, highlights drift towards cream, shadows towards umber, and the blacks are lifted so nothing is pure black — the look of varnish that has yellowed for a century.",
  },
  {
    step: "Weave the canvas",
    body: "A woven texture is generated in the shader itself and laid over the paint. No texture file is downloaded.",
  },
  {
    step: "Craze the varnish",
    body: "Optional: a fine web of cracks, the kind old varnish develops. Off by default, on in the Aged Canvas style.",
  },
  {
    step: "Varnish and vignette",
    body: "The edges darken and the centre warms, the way a lit painting looks on a dark wall.",
  },
  {
    step: "Hand it back",
    body: "You download it. Optionally you save it to a gallery — that is the only moment anything is uploaded.",
  },
];

const stack = [
  { name: "Next.js", role: "The site itself, in TypeScript" },
  { name: "WebGL2", role: "The painting engine, running on your graphics card" },
  { name: "Tailwind CSS", role: "The styling" },
  { name: "IndexedDB", role: "The gallery, kept in your own browser" },
  { name: "Vercel", role: "Hosting" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
      <p className="text-[11px] uppercase tracking-[0.3em] text-turquoise">
        About
      </p>
      <h1 className="mt-5 text-balance font-serif text-3xl leading-tight text-paper sm:text-5xl">
        What Patina is
      </h1>
      <div className="mt-6 h-px w-20 bg-gold" />

      <p className="mt-8 text-base leading-relaxed text-muted">
        <em className="text-paper not-italic">Patina</em> is the yellowed layer
        of varnish that settles on an old painting over a century or two. It is
        also what this site does to a photograph: it repaints the image the way
        a 19th-century painter would have, then ages it.
      </p>

      <p className="mt-4 text-base leading-relaxed text-muted">
        There is no artificial intelligence here and no server doing the work.
        The whole thing is a chain of shaders running on your own graphics card,
        a few milliseconds at a time.
      </p>

      <h2 className="mt-14 text-balance font-serif text-2xl text-paper sm:text-3xl">
        Your photo never leaves your device
      </h2>
      <div className="mt-4 h-px w-12 bg-gold-d" />
      <p className="mt-5 text-base leading-relaxed text-muted">
        This is not a privacy policy written to sound reassuring — it is a
        description of how the code works. There is no upload step. Your browser
        reads the file, paints it, and hands it back to you. No server ever
        receives it.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted">
        There is no exception, not even for the gallery. Pressing{" "}
        <span className="text-paper">Keep in gallery</span> stores the painting
        in your own browser, on your own machine — the same place this site
        keeps which slider you moved last. Nothing is uploaded, which is why
        Patina has never asked you for an email address.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted">
        The honest cost of that: a gallery belongs to one browser. Clearing
        your site data empties it, and it will not follow you to your phone.
        Downloading is how you keep a painting for good.
      </p>

      <h2 className="mt-14 text-balance font-serif text-2xl text-paper sm:text-3xl">Why it is free</h2>
      <div className="mt-4 h-px w-12 bg-gold-d" />
      <p className="mt-5 text-base leading-relaxed text-muted">
        Image generation services charge because every picture costs them
        computing time. Patina costs nothing to run, because the computing
        happens on your machine, not on a rented one. So there is no quota, no
        queue, no watermark and no paid tier — not now and not later.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted">
        There are no adverts, no analytics and no third-party trackers. Nothing
        on this site is counting you.
      </p>

      <h2 className="mt-14 text-balance font-serif text-2xl text-paper sm:text-3xl">How it works</h2>
      <div className="mt-4 h-px w-12 bg-gold-d" />
      <ol className="mt-7 space-y-6">
        {pipeline.map((item, index) => (
          <li key={item.step} className="flex gap-4 sm:gap-5">
            <span
              aria-hidden
              className="mt-1 w-6 shrink-0 font-serif text-lg text-gold"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-paper">{item.step}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-14 text-balance font-serif text-2xl text-paper sm:text-3xl">Built with</h2>
      <div className="mt-4 h-px w-12 bg-gold-d" />
      <dl className="mt-6 space-y-3">
        {stack.map((item) => (
          <div
            key={item.name}
            className="flex flex-col gap-0.5 border-b border-white/5 pb-3 sm:flex-row sm:gap-4"
          >
            <dt className="w-36 shrink-0 text-sm text-paper">{item.name}</dt>
            <dd className="text-sm text-muted">{item.role}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-14 flex flex-col items-start gap-3 sm:flex-row">
        <Button href="/studio" size="lg">
          Start painting
        </Button>
        <Button href="/" variant="ghost" size="lg">
          Back to the wall
        </Button>
      </div>
    </div>
  );
}
