/**
 * The Patina mark: one disc, split down the middle, the right half aged.
 *
 * It is the site's own argument in miniature. Everything Patina does is the
 * same picture with varnish over half of it, and that is literally what this
 * draws — a clean field, a gilt seam, and the same field after a century.
 *
 * Built from two half-circle paths rather than a clipped square, so there is
 * nothing to clip and no stacking context to get wrong. The gold ring is the
 * frame it hangs in.
 *
 * Why a disc and not a frame: at sixteen pixels a rectangle with a picture
 * inside collapses into a grey smudge, while light-half/dark-half survives
 * anything. The favicon is the size that decides a mark, not the hero.
 */
export default function Mark({
  size = 28,
  className = "",
  title,
}: {
  size?: number;
  className?: string;
  /** Give this only where the mark is the sole content of a link. */
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <path d="M24 7a17 17 0 0 0 0 34z" fill="#efe9dc" />
      <path d="M24 7a17 17 0 0 1 0 34z" fill="#a9761f" />
      <rect x="23.3" y="7" width="1.4" height="34" fill="#c9a227" />
      <circle
        cx="24"
        cy="24"
        r="17"
        fill="none"
        stroke="#c9a227"
        strokeWidth="1.6"
      />
    </svg>
  );
}
