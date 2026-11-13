import type { PaintSettings } from "./pipeline";
import type { CpuRequest, CpuResponse } from "./cpu.worker";

/**
 * The page's side of the compatibility renderer.
 *
 * Holds one worker for the life of a photograph and speaks to it in
 * numbered requests. Because the worker abandons anything but the newest
 * request, a dragged slider cannot pile up a queue of renders nobody is
 * waiting for any more — the last one simply wins.
 *
 * Pixels go across as a transferable buffer rather than a copy. For a
 * 640x480 preview that is 1.2MB, and copying it twice per render on the
 * sort of device that needs this renderer is not free.
 */
export class CpuEngine {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<
    number,
    {
      resolve: (value: ImageData) => void;
      reject: (reason: Error) => void;
      onProgress?: (done: number) => void;
    }
  >();
  private disposed = false;

  constructor() {
    this.worker = new Worker(new URL("./cpu.worker.ts", import.meta.url));

    this.worker.onmessage = (event: MessageEvent<CpuResponse>) => {
      const message = event.data;
      const waiting = this.pending.get(message.id);
      if (!waiting) return;

      if (message.kind === "progress") {
        waiting.onProgress?.(message.done);
        return;
      }

      this.pending.delete(message.id);

      if (message.kind === "error") {
        waiting.reject(new Error(message.message));
        return;
      }

      waiting.resolve(
        new ImageData(
          new Uint8ClampedArray(message.pixels),
          message.width,
          message.height
        )
      );
    };

    this.worker.onerror = () => {
      for (const waiting of this.pending.values()) {
        waiting.reject(new Error("The compatibility renderer stopped."));
      }
      this.pending.clear();
    };
  }

  render(
    source: HTMLCanvasElement,
    settings: PaintSettings,
    onProgress?: (done: number) => void
  ): Promise<ImageData> {
    if (this.disposed) {
      return Promise.reject(new Error("This renderer has been disposed."));
    }

    const context = source.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return Promise.reject(new Error("This browser would not give Patina a canvas."));
    }

    const image = context.getImageData(0, 0, source.width, source.height);
    const id = this.nextId++;

    // Anything still waiting is now stale; the worker has dropped it too.
    for (const [key, waiting] of this.pending) {
      waiting.reject(new Error("superseded"));
      this.pending.delete(key);
    }

    const request: CpuRequest = {
      id,
      width: source.width,
      height: source.height,
      pixels: image.data.buffer as ArrayBuffer,
      settings: {
        intensity: settings.intensity,
        brushSize: settings.brushSize,
        sharpness: settings.sharpness,
        eccentricity: settings.eccentricity,
        denoise: settings.denoise,
        warmth: settings.warmth,
        contrast: settings.contrast,
        saturation: settings.saturation,
        canvasTexture: settings.canvasTexture,
        vignette: settings.vignette,
      },
    };

    return new Promise<ImageData>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress });
      this.worker.postMessage(request, [request.pixels]);
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.worker.terminate();
    this.pending.clear();
  }
}

/** True when a render was thrown away because a newer one arrived. */
export function isSuperseded(cause: unknown): boolean {
  return cause instanceof Error && cause.message === "superseded";
}
