/**
 * The little brass label museums screw to the wall under a painting.
 *
 * Title in italic serif, then style and date in small caps — the order real
 * museum labels use. Kept deliberately quiet so it never competes with the
 * work above it.
 */
export default function Plaque({
  title,
  style,
  date,
  className = "",
}: {
  title: string;
  style: string;
  date: string;
  className?: string;
}) {
  return (
    <figcaption
      className={`mx-auto mt-5 max-w-xs border-t border-gold-d/50 pt-3 text-center ${className}`}
    >
      <p className="font-serif text-lg italic text-paper">{title}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">
        {style} · {date}
      </p>
    </figcaption>
  );
}
