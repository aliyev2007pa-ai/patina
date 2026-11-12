import type { ReactNode } from "react";

/**
 * A thin gold frame, the way a painting hangs on a gallery wall.
 *
 * Built from nested borders rather than an image: three hairlines and a dark
 * inner edge read as a bevel, cost nothing to download, and stay crisp at any
 * zoom level. The gold is a flat token, not a gradient — PROJECT.md 1.5 asks
 * for calm surfaces, and metallic gradients look cheap on a black wall.
 */
export default function GoldFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xs bg-gradient-to-b from-gold/90 to-gold-d p-[3px] shadow-[0_18px_48px_-24px_rgba(0,0,0,0.9)] ${className}`}
    >
      <div className="rounded-xs bg-ink p-[2px]">
        <div className="overflow-hidden rounded-xs ring-1 ring-black/60">
          {children}
        </div>
      </div>
    </div>
  );
}
