"use client";

import { useId } from "react";

/**
 * One labelled control. The current value is always shown, because a slider
 * whose value you cannot read is guesswork.
 */
export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <div className={disabled ? "opacity-50" : undefined}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-xs tracking-wide text-muted">
          {label}
        </label>
        <span className="font-serif text-sm text-paper tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-turquoise"
      />
    </div>
  );
}
