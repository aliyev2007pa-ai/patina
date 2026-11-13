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
        // Sizing and the thumb live in globals.css: a 4px track needs real
        // pseudo-element rules, and a 4px-tall element is an unhittable
        // target on a phone.
        className="mt-1 w-full"
      />
    </div>
  );
}
