import { readOrientation, swapsAxes, type Orientation } from "./exif";

/**
 * Turns a validated file into an upright canvas, no larger than 2048px on its
 * long edge (PROJECT.md 3.2, step 1).
 *
 * The awkward part is EXIF rotation, because browsers disagree about who is
 * responsible for it. Older ones hand back the raw sensor pixels and expect
 * the page to rotate them; newer ones rotate during decoding and ignore a
 * request not to. Guessing wrong in either direction is visible: either every
 * phone photo arrives on its side, or it arrives upside down because it was
 * rotated twice.
 *
 * So the code does not guess. On first use it decodes a two-pixel JPEG that
 * carries an orientation tag and measures what came back. If the browser
 * rotated it, we leave rotation alone; if it did not, we rotate ourselves.
 * The answer is worked out once per page load and reused.
 *
 * A side effect worth having: redrawing through a canvas strips EXIF
 * completely, so location and device data cannot survive into a saved
 * painting. That is PROJECT.md 6.5, satisfied by construction.
 */

export const MAX_EDGE = 2048;

export type DecodedImage = {
  /** Upright, downscaled pixels. FAZ 3 will feed this straight to WebGL. */
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  /** Upright dimensions before downscaling, so the UI can say what it did. */
  sourceWidth: number;
  sourceHeight: number;
  orientation: Orientation;
  /** True when this code rotated the pixels rather than the browser. */
  rotatedByUs: boolean;
};

export class DecodeError extends Error {}

type Decoded = ImageBitmap | HTMLImageElement;

function sizeOf(source: Decoded) {
  return "naturalWidth" in source
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

function release(source: Decoded) {
  if ("close" in source) source.close();
}

/** Decodes a blob, asking for EXIF rotation to be applied where that is honoured. */
async function decodeBlob(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      try {
        return await createImageBitmap(blob);
      } catch {
        // Fall through to the <img> path.
      }
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new DecodeError("The image could not be read."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * An EXIF APP1 segment declaring orientation 6 — "rotate this 90° clockwise".
 * Written out by hand because it is 36 bytes and a dependency would be absurd.
 */
const EXIF_ROTATE_90 = new Uint8Array([
  0xff, 0xe1, 0x00, 0x22, // APP1, segment length 34
  0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
  0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF: little-endian, 42, IFD0 at 8
  0x01, 0x00, // one entry
  0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, // tag 0x0112, SHORT, count 1
  0x06, 0x00, 0x00, 0x00, // value: 6
  0x00, 0x00, 0x00, 0x00, // no next IFD
]);

/** Builds a 2×1 JPEG carrying that tag. Upright it is 2 wide; rotated, 1. */
async function makeProbe(): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 2, 1);

  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.5)
  );
  if (!jpeg) return null;

  const base = new Uint8Array(await jpeg.arrayBuffer());
  if (base.length < 4 || base[0] !== 0xff || base[1] !== 0xd8) return null;

  const out = new Uint8Array(base.length + EXIF_ROTATE_90.length);
  out.set(base.subarray(0, 2), 0);
  out.set(EXIF_ROTATE_90, 2);
  out.set(base.subarray(2), 2 + EXIF_ROTATE_90.length);
  return new Blob([out], { type: "image/jpeg" });
}

let probe: Promise<boolean> | null = null;

/** True when the browser applies EXIF rotation during decoding. */
function browserRotatesForUs(): Promise<boolean> {
  probe ??= (async () => {
    try {
      const blob = await makeProbe();
      if (!blob) return true;
      const decoded = await decodeBlob(blob);
      const { width, height } = sizeOf(decoded);
      release(decoded);
      // 2×1 upright; 1×2 means the browser turned it.
      return height > width;
    } catch {
      // Assume it does. Every current browser does, and guessing the other way
      // would rotate twice, which looks far worse than not rotating at all.
      return true;
    }
  })();
  return probe;
}

/** Maps an EXIF orientation onto a canvas transform. */
function applyOrientation(
  context: CanvasRenderingContext2D,
  orientation: Orientation,
  width: number,
  height: number
) {
  switch (orientation) {
    case 2:
      context.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      context.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      context.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      context.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      context.transform(0, 1, -1, 0, width, 0);
      break;
    case 7:
      context.transform(0, -1, -1, 0, width, height);
      break;
    case 8:
      context.transform(0, -1, 1, 0, 0, height);
      break;
    default:
      break; // 1 — already upright
  }
}

export async function decodeImage(
  file: Blob,
  bytes: ArrayBuffer
): Promise<DecodedImage> {
  const orientation = readOrientation(bytes);
  const [source, browserRotated] = await Promise.all([
    decodeBlob(file),
    browserRotatesForUs(),
  ]);

  const raw = sizeOf(source);
  if (raw.width === 0 || raw.height === 0) {
    release(source);
    throw new DecodeError("That photo has no pixels in it.");
  }

  // Only rotate ourselves if the browser did not already do it.
  const rotatedByUs = !browserRotated && orientation !== 1;
  const swap = rotatedByUs && swapsAxes(orientation);

  const uprightWidth = swap ? raw.height : raw.width;
  const uprightHeight = swap ? raw.width : raw.height;

  const scale = Math.min(1, MAX_EDGE / Math.max(uprightWidth, uprightHeight));
  const width = Math.max(1, Math.round(uprightWidth * scale));
  const height = Math.max(1, Math.round(uprightHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    release(source);
    throw new DecodeError(
      "This browser would not give Patina a canvas to draw on."
    );
  }

  context.imageSmoothingQuality = "high";
  context.save();
  if (rotatedByUs) {
    applyOrientation(context, orientation, width, height);
  }

  // Inside a quarter-turn transform the axes are swapped, so the draw has to
  // use the pre-rotation extents; the transform puts them back the right way.
  const drawWidth = swap ? height : width;
  const drawHeight = swap ? width : height;
  context.drawImage(source, 0, 0, drawWidth, drawHeight);
  context.restore();

  release(source);

  return {
    canvas,
    width,
    height,
    sourceWidth: uprightWidth,
    sourceHeight: uprightHeight,
    orientation,
    rotatedByUs,
  };
}
