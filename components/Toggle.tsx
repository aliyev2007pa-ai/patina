"use client";

import { useId } from "react";

/**
 * An on/off control, built on a real checkbox so the keyboard, screen readers
 * and form semantics all work without being reimplemented. The checkbox
 * itself is hidden and the track is drawn from its checked state.
 */
export default function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <div className={disabled ? "opacity-50" : undefined}>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-xs tracking-wide text-muted">
          {label}
        </label>

        <span className="relative inline-flex shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="h-5 w-9 cursor-pointer rounded-full bg-surface-2 ring-1 ring-white/10 transition-colors duration-200 peer-checked:bg-turquoise peer-focus-visible:ring-2 peer-focus-visible:ring-turquoise"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-paper transition-transform duration-200 peer-checked:translate-x-4"
          />
        </span>
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted/70">{hint}</p>}
    </div>
  );
}
