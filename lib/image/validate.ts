/**
 * File validation, before anything is decoded.
 *
 * The browser hands us `file.type`, but that string comes from the operating
 * system's guess at the extension — rename `virus.exe` to `cat.jpg` and the
 * browser will cheerfully report `image/jpeg`. So the type is checked twice:
 * once from the declared MIME type, and once from the first bytes of the file
 * itself (its "magic bytes"), which a renamed file cannot fake.
 *
 * PROJECT.md section 6, rule 4.
 */

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedType = (typeof ACCEPTED_TYPES)[number];

/** PROJECT.md 6.4 — anything larger than this is refused before decoding. */
export const MAX_INPUT_BYTES = 10 * 1024 * 1024;

export type ValidationError =
  | { kind: "type"; message: string }
  | { kind: "size"; message: string }
  | { kind: "signature"; message: string }
  | { kind: "empty"; message: string };

export type ValidationResult =
  | { ok: true; type: AcceptedType; bytes: ArrayBuffer }
  | { ok: false; error: ValidationError };

function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Reads the first bytes of a file and reports what it actually is.
 * Returns null when the signature matches none of the formats we accept.
 */
export function sniffType(bytes: ArrayBuffer): AcceptedType | null {
  const head = new Uint8Array(bytes, 0, Math.min(16, bytes.byteLength));

  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, i) => head[i] === byte)) {
    return "image/png";
  }

  // WebP: "RIFF" .... "WEBP"
  const riff = [0x52, 0x49, 0x46, 0x46];
  const webp = [0x57, 0x45, 0x42, 0x50];
  if (
    riff.every((byte, i) => head[i] === byte) &&
    webp.every((byte, i) => head[8 + i] === byte)
  ) {
    return "image/webp";
  }

  return null;
}

export async function validateImageFile(file: File): Promise<ValidationResult> {
  if (file.size === 0) {
    return {
      ok: false,
      error: { kind: "empty", message: "That file is empty." },
    };
  }

  if (file.size > MAX_INPUT_BYTES) {
    return {
      ok: false,
      error: {
        kind: "size",
        message: `That photo is ${formatMB(file.size)}. The limit is ${formatMB(
          MAX_INPUT_BYTES
        )} — try a smaller one.`,
      },
    };
  }

  if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
    return {
      ok: false,
      error: {
        kind: "type",
        message: "That is not a photo Patina can read. Use a JPEG, PNG or WebP.",
      },
    };
  }

  const bytes = await file.arrayBuffer();
  const actual = sniffType(bytes);

  if (actual === null) {
    return {
      ok: false,
      error: {
        kind: "signature",
        message:
          "That file looks damaged — it is named like a photo but does not contain one.",
      },
    };
  }

  return { ok: true, type: actual, bytes };
}
