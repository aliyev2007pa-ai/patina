"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Two images stacked, with a divider the viewer drags to wipe between them
 * (PROJECT.md 3.5). Without this the painting is hard to judge — the eye
 * forgets the photograph within seconds.
 *
 * The position is held as a percentage and applied with `clip-path`, so the
 * browser composites it on the GPU and dragging stays smooth even at 2048px.
 *
 * It is also a slider for the keyboard: arrow keys move the divider, which
 * costs one `role` and one key handler and makes the comparison usable
 * without a mouse.
 */
export default function BeforeAfter({
  beforeSrc,
  afterSrc,
  width,
  height,
  beforeLabel = "Photo",
  afterLabel = "Patina",
}: {
  beforeSrc: string;
  afterSrc: string;
  width: number;
  height: number;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [position, setPosition] = useState(50);
  const frame = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const moveTo = useCallback((clientX: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const ratio = ((clientX - box.left) / box.width) * 100;
    setPosition(Math.min(100, Math.max(0, ratio)));
  }, []);

  const onPointerDown = (event: React.PointerEvent) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientX);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (dragging.current) moveTo(event.clientX);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 10 : 2;
    if (event.key === "ArrowLeft") {
      setPosition((p) => Math.max(0, p - step));
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      setPosition((p) => Math.min(100, p + step));
      event.preventDefault();
    } else if (event.key === "Home") {
      setPosition(0);
      event.preventDefault();
    } else if (event.key === "End") {
      setPosition(100);
      event.preventDefault();
    }
  };

  return (
    <div
      ref={frame}
      role="slider"
      tabIndex={0}
      aria-label="Compare the photograph with the painting"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      aria-valuetext={`${Math.round(position)}% painting`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      className="relative touch-none select-none"
      style={{ aspectRatio: `${width} / ${height}`, cursor: "ew-resize" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterSrc}
        alt="The painting"
        className="absolute inset-0 h-full w-full"
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeSrc}
        alt="The original photograph"
        className="absolute inset-0 h-full w-full"
        draggable={false}
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-px bg-gold"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold bg-ink/80 shadow-[0_2px_12px_rgba(0,0,0,0.8)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] tracking-widest text-gold">
          ◀▶
        </div>
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.25em] text-white/70"
      >
        {beforeLabel}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 bottom-3 text-[10px] uppercase tracking-[0.25em] text-gold"
      >
        {afterLabel}
      </span>
    </div>
  );
}
