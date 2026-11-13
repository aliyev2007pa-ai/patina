import { DEFAULT_SETTINGS, type PaintSettings } from "./pipeline";

/**
 * The styles, as PROJECT.md 3.3 lays them out, plus one.
 *
 * Each is a saved set of the same controls the sliders drive — nothing a
 * preset does is unavailable by hand. They exist because twelve sliders is a
 * lot to face on arrival, and because the differences between these five
 * schools are differences of recipe, not of technique.
 *
 * **A deviation worth stating.** PROJECT.md names Ottoman Court as the
 * default. It is not, any more: Aliyev asked, later and explicitly, that a
 * photograph keep its own colours — a red coat should come out as a painting
 * of a red coat, not as a sepia one. So the default is `natural`, which
 * paints without restaining, and Ottoman Court sits one click away. The
 * instruction was clear and came after the document was written; say the
 * word and the default moves back.
 */

export type PresetId =
  | "natural"
  | "ottoman"
  | "rembrandt"
  | "renaissance"
  | "baroque"
  | "aged";

export type Preset = {
  id: PresetId;
  name: string;
  /** One line, shown under the name. */
  note: string;
  settings: PaintSettings;
};

export const PRESETS: Preset[] = [
  {
    id: "natural",
    name: "Natural",
    note: "Painted, but in the photograph's own colours.",
    settings: { ...DEFAULT_SETTINGS },
  },
  {
    id: "ottoman",
    name: "Ottoman Court",
    note: "Warm gold and brown, strong light, a confident brush.",
    settings: {
      ...DEFAULT_SETTINGS,
      brushSize: 11,
      sharpness: 15,
      eccentricity: 2.6,
      impasto: 0.85,
      warmth: 0.85,
      contrast: 0.55,
      saturation: 0.9,
      canvasTexture: 0.6,
      vignette: 0.6,
    },
  },
  {
    id: "rembrandt",
    name: "Rembrandt",
    note: "Deep shadow, one warm light, everything else given up.",
    settings: {
      ...DEFAULT_SETTINGS,
      brushSize: 12,
      sharpness: 16,
      eccentricity: 2.8,
      detailAdapt: 0.9,
      impasto: 0.9,
      warmth: 0.8,
      contrast: 0.85,
      saturation: 0.72,
      canvasTexture: 0.45,
      vignette: 0.9,
    },
  },
  {
    id: "renaissance",
    name: "Renaissance",
    note: "Even light, soft transitions, a fine and patient brush.",
    settings: {
      ...DEFAULT_SETTINGS,
      brushSize: 6,
      sharpness: 11,
      eccentricity: 2,
      detailAdapt: 0.6,
      secondPass: 0.9,
      strokeJitter: 0.35,
      impasto: 0.45,
      warmth: 0.45,
      contrast: 0.2,
      saturation: 0.82,
      canvasTexture: 0.4,
      vignette: 0.25,
    },
  },
  {
    id: "baroque",
    name: "Baroque",
    note: "Loaded brush, deep colour, theatre.",
    settings: {
      ...DEFAULT_SETTINGS,
      brushSize: 14,
      sharpness: 17,
      eccentricity: 3,
      detailAdapt: 0.85,
      strokeJitter: 0.7,
      impasto: 1,
      warmth: 0.6,
      contrast: 0.7,
      saturation: 1.1,
      canvasTexture: 0.7,
      vignette: 0.75,
    },
  },
  {
    id: "aged",
    name: "Aged Canvas",
    note: "Two centuries of varnish, and the cracks that come with them.",
    settings: {
      ...DEFAULT_SETTINGS,
      brushSize: 8,
      sharpness: 12,
      eccentricity: 2.2,
      strokeJitter: 0.55,
      impasto: 0.5,
      warmth: 1,
      contrast: 0.35,
      saturation: 0.6,
      canvasTexture: 0.9,
      vignette: 0.55,
      cracks: 0.75,
    },
  },
];

export const DEFAULT_PRESET: PresetId = "natural";

export function presetById(id: PresetId): Preset {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
}

/** Which preset these settings match exactly, if any. */
export function matchPreset(settings: PaintSettings): PresetId | null {
  const found = PRESETS.find((preset) =>
    (Object.keys(preset.settings) as (keyof PaintSettings)[]).every(
      (key) => preset.settings[key] === settings[key]
    )
  );
  return found?.id ?? null;
}
