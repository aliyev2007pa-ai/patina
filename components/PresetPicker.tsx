"use client";

import { PRESETS, type PresetId } from "@/lib/engine/presets";

/**
 * The five schools, plus Natural, as a list of radio buttons.
 *
 * Real radios rather than styled buttons, so the arrow keys move between
 * them and a screen reader announces it as one choice out of six. The input
 * itself is hidden and the row is drawn from its checked state.
 *
 * `active` is null once a slider has been touched: the settings no longer
 * match any preset, and pretending otherwise would be a lie about what is
 * on screen.
 */
export default function PresetPicker({
  active,
  onPick,
  disabled = false,
}: {
  active: PresetId | null;
  onPick: (id: PresetId) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset
      className={`rounded-sm border border-white/10 bg-surface/50 p-5 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <legend className="px-1 font-serif text-lg text-paper">The school</legend>

      <div className="mt-1 space-y-1">
        {PRESETS.map((preset) => {
          const checked = active === preset.id;
          return (
            <label
              key={preset.id}
              className={`block cursor-pointer rounded-sm px-3 py-2 transition-colors duration-200 ${
                checked
                  ? "bg-turquoise/10 ring-1 ring-turquoise/50"
                  : "hover:bg-white/5"
              } ${disabled ? "pointer-events-none" : ""}`}
            >
              <input
                type="radio"
                name="patina-preset"
                value={preset.id}
                checked={checked}
                disabled={disabled}
                onChange={() => onPick(preset.id)}
                className="peer sr-only"
              />
              <span
                className={`block text-sm ${
                  checked ? "text-turquoise" : "text-paper"
                }`}
              >
                {preset.name}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                {preset.note}
              </span>
            </label>
          );
        })}
      </div>

      {active === null && (
        <p className="mt-3 px-3 text-[11px] text-muted">
          Adjusted by hand. Pick a school to start again.
        </p>
      )}
    </fieldset>
  );
}
