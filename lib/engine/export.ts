/**
 * Turning a finished painting into a file.
 *
 * Two jobs: optionally hang the picture in a frame with a museum label under
 * it, and hand the result to the browser as a download. Both are ordinary
 * 2D canvas work — the engine's job ended when the pixels were painted.
 *
 * Drawing the frame here rather than in a shader is deliberate. The frame is
 * not part of the painting; it is furniture around it, and it has to grow
 * with the picture rather than with the brush. Text in a shader would also
 * mean building a font atlas, which is a great deal of work to draw four
 * words.
 */

export type Plaque = {
  title: string;
  style: string;
  date: string;
};

/** The palette, duplicated here because a canvas cannot read CSS variables. */
const INK = "#0b0b0c";
const GOLD = "#c9a227";
const GOLD_DARK = "#8c6a1a";
const PAPER = "#f7f3ea";
const MUTED = "#9a968e";

/**
 * Draws the painting inside a gold frame, with a plaque beneath it.
 *
 * Every measurement is a fraction of the painting's long edge, so a 600px
 * preview and a 2048px render come out looking identical rather than one of
 * them having a hairline frame and the other a plank.
 */
export function withFrame(
  painting: HTMLCanvasElement,
  plaque: Plaque | null
): HTMLCanvasElement {
  const unit = Math.max(painting.width, painting.height) / 100;

  const frame = Math.round(unit * 2.6);
  const mount = Math.round(unit * 1.1);
  const margin = Math.round(unit * 5);
  const plaqueHeight = plaque ? Math.round(unit * 13) : 0;

  const border = frame + mount;
  const canvas = document.createElement("canvas");
  canvas.width = painting.width + (border + margin) * 2;
  canvas.height = painting.height + (border + margin) * 2 + plaqueHeight;

  const context = canvas.getContext("2d");
  if (!context) return painting;

  // The wall.
  context.fillStyle = INK;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const frameX = margin;
  const frameY = margin;
  const frameW = painting.width + border * 2;
  const frameH = painting.height + border * 2;

  // The moulding: a soft vertical gradient reads as a rounded gilt edge
  // catching the light from above, without any of it being drawn.
  const gilt = context.createLinearGradient(0, frameY, 0, frameY + frameH);
  gilt.addColorStop(0, GOLD);
  gilt.addColorStop(0.5, GOLD_DARK);
  gilt.addColorStop(1, GOLD);
  context.fillStyle = gilt;
  context.fillRect(frameX, frameY, frameW, frameH);

  // A dark rebate between the gilt and the canvas, which is what stops a
  // flat gold rectangle from looking like a coloured border.
  context.fillStyle = INK;
  context.fillRect(
    frameX + frame,
    frameY + frame,
    frameW - frame * 2,
    frameH - frame * 2
  );

  context.drawImage(painting, frameX + border, frameY + border);

  if (plaque) {
    const centre = canvas.width / 2;
    const top = frameY + frameH + Math.round(unit * 4);

    context.strokeStyle = GOLD_DARK;
    context.lineWidth = Math.max(1, Math.round(unit * 0.12));
    context.beginPath();
    context.moveTo(centre - unit * 14, top);
    context.lineTo(centre + unit * 14, top);
    context.stroke();

    context.textAlign = "center";
    context.textBaseline = "top";

    context.fillStyle = PAPER;
    context.font = `italic ${Math.round(unit * 3.6)}px Georgia, serif`;
    context.fillText(plaque.title, centre, top + unit * 2.2, canvas.width - margin * 2);

    context.fillStyle = MUTED;
    context.font = `${Math.round(unit * 2.1)}px Helvetica, Arial, sans-serif`;
    const caption = `${plaque.style.toUpperCase()}  ·  ${plaque.date.toUpperCase()}`;
    context.fillText(caption, centre, top + unit * 7.4, canvas.width - margin * 2);
  }

  return canvas;
}

export type ExportFormat = "png" | "jpeg";

/**
 * Hands a canvas to the browser as a download.
 *
 * The object URL is released on the next turn of the event loop rather than
 * immediately: revoking it in the same tick can beat the browser to reading
 * it, and the download silently fails.
 */
export function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  format: ExportFormat
): Promise<void> {
  const type = format === "png" ? "image/png" : "image/jpeg";
  // PROJECT.md 3.2 step 9 asks for 0.92 on JPEG: visually lossless here,
  // and roughly a fifth of the size of a PNG of the same painting.
  const quality = format === "png" ? undefined : 0.92;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("The painting could not be prepared for download."));
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        resolve();
      },
      type,
      quality
    );
  });
}

/** `holiday-photo.jpg` becomes `holiday-photo-patina.png`. */
export function exportName(original: string, format: ExportFormat): string {
  const stem = original.replace(/\.[^.]+$/, "").slice(0, 60) || "painting";
  return `${stem}-patina.${format === "png" ? "png" : "jpg"}`;
}
