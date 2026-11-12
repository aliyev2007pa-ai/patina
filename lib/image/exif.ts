/**
 * Reads one number out of a JPEG: the EXIF orientation tag.
 *
 * Why this matters: phones do not rotate the pixels when you turn the phone
 * sideways. They store the photo as the sensor saw it and write a note saying
 * "this is rotated 90°". Software is expected to read that note. If we ignore
 * it, every photo taken in portrait arrives lying on its side.
 *
 * The note lives in a JPEG's APP1 segment, inside a TIFF header, as tag 0x0112.
 * PNG and WebP have no equivalent in practice, so they are always upright (1).
 *
 * The eight possible values, as defined by the EXIF specification:
 *   1  upright                     5  rotate 90° CW + flip horizontally
 *   2  flipped horizontally        6  rotate 90° CW
 *   3  rotated 180°                7  rotate 90° CCW + flip horizontally
 *   4  flipped vertically          8  rotate 90° CCW
 */

export type Orientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Orientations 5–8 swap the image's width and height. */
export function swapsAxes(orientation: Orientation): boolean {
  return orientation >= 5;
}

/**
 * Walks a JPEG's segment headers looking for EXIF. Returns 1 — upright — for
 * anything it cannot read, which is always the safe answer: an image shown
 * unrotated is merely wrong for one user, while a crash is wrong for everyone.
 */
export function readOrientation(buffer: ArrayBuffer): Orientation {
  const view = new DataView(buffer);

  // A JPEG always starts with the Start Of Image marker, FF D8.
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) {
    return 1;
  }

  let offset = 2;

  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset, false);

    // Every segment marker starts with FF. If this one does not, the file is
    // malformed or we have walked into image data; either way, stop.
    if ((marker & 0xff00) !== 0xff00) return 1;

    // Start Of Scan — the compressed pixels begin here, no metadata follows.
    if (marker === 0xffda) return 1;

    const segmentLength = view.getUint16(offset + 2, false);
    if (segmentLength < 2) return 1;

    // APP1 is where EXIF lives, identified by the ASCII string "Exif\0\0".
    if (marker === 0xffe1 && offset + 10 <= view.byteLength) {
      const isExif =
        view.getUint32(offset + 4, false) === 0x45786966 && // "Exif"
        view.getUint16(offset + 8, false) === 0x0000;

      if (isExif) {
        const found = readOrientationFromTiff(view, offset + 10);
        if (found !== null) return found;
      }
    }

    offset += 2 + segmentLength;
  }

  return 1;
}

/**
 * Reads the first Image File Directory of the embedded TIFF block.
 *
 * TIFF can be written with either byte order, which is why every value below
 * is read with an explicit `littleEndian` flag rather than a default.
 */
function readOrientationFromTiff(
  view: DataView,
  tiffStart: number
): Orientation | null {
  if (tiffStart + 8 > view.byteLength) return null;

  const byteOrder = view.getUint16(tiffStart, false);
  let littleEndian: boolean;

  if (byteOrder === 0x4949) {
    littleEndian = true; // "II" — Intel
  } else if (byteOrder === 0x4d4d) {
    littleEndian = false; // "MM" — Motorola
  } else {
    return null;
  }

  // A fixed marker, 42, confirming the byte order was read correctly.
  if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return null;

  const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
  const ifdStart = tiffStart + ifdOffset;
  if (ifdStart + 2 > view.byteLength) return null;

  const entryCount = view.getUint16(ifdStart, littleEndian);

  for (let i = 0; i < entryCount; i++) {
    const entry = ifdStart + 2 + i * 12;
    if (entry + 12 > view.byteLength) return null;

    if (view.getUint16(entry, littleEndian) === 0x0112) {
      const value = view.getUint16(entry + 8, littleEndian);
      return value >= 1 && value <= 8 ? (value as Orientation) : 1;
    }
  }

  return null;
}
