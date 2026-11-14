import Image from "next/image";
import photo from "@/public/sample-photo.jpg";
import painting from "@/public/sample-painting.jpg";

/**
 * The example on the landing page: one photograph, split down the middle,
 * with the right half painted.
 *
 * This used to be a hand-drawn SVG, put here in FAZ 1 because the engine did
 * not exist yet. It stayed long after the engine did, which meant a site that
 * paints photographs was showing an imitation of its own output above the
 * fold. These two files are the real thing — the right half came out of the
 * site's own download button, at the Ottoman Court preset, so what a visitor
 * sees here is exactly what they would get.
 *
 * The split is a clip rather than two boxes side by side: both images occupy
 * the same frame, so the seam falls on the same feature in each half and the
 * eye can compare a lamp to a lamp.
 *
 * Static, with no slider. The studio has a draggable comparison already; this
 * is a shop window, and a landing page should not need JavaScript to make its
 * point.
 */
export default function SampleArtwork({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`relative aspect-3/4 overflow-hidden ${className}`}>
      <Image
        src={painting}
        alt="The same street, repainted by Patina as an oil painting"
        fill
        sizes="(max-width: 640px) 100vw, 384px"
        className="object-cover"
        placeholder="blur"
        priority
      />

      <Image
        src={photo}
        alt="A photograph of a cobbled street at dusk"
        fill
        sizes="(max-width: 640px) 100vw, 384px"
        className="object-cover [clip-path:inset(0_50%_0_0)]"
        placeholder="blur"
        priority
      />

      {/* The seam, and the two labels that say which side is which. */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gold/80"
      />
      <span
        aria-hidden
        className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.25em] text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
      >
        Photo
      </span>
      <span
        aria-hidden
        className="absolute right-3 bottom-3 text-[10px] uppercase tracking-[0.25em] text-gold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
      >
        Patina
      </span>
    </div>
  );
}
