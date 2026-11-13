import {
  createContext,
  createProgram,
  createRenderTarget,
  createSourceTexture,
  GLError,
  runPass,
  type RenderTarget,
} from "./gl";
import { DENOISE_SHADER } from "./shaders/denoise";
import { TENSOR_SHADER, TENSOR_BLUR_SHADER } from "./shaders/tensor";
import { KUWAHARA_SHADER } from "./shaders/kuwahara";
import { OUTPUT_SHADER } from "./shaders/output";

export { GLError };

/**
 * The paint engine, as far as FAZ 3a goes.
 *
 * Steps 1–3 of the pipeline in PROJECT.md 3.2: normalise, denoise, and lay
 * the brush strokes. Impasto, tone, canvas and varnish come next.
 *
 * The engine is built once per photograph and reused for every re-render, so
 * dragging a slider recompiles nothing and reuploads nothing — it just runs
 * the passes again. Everything it allocates is released by `dispose`.
 */

export type PaintSettings = {
  /** Brush size in pixels at full resolution (PROJECT.md 3.4). */
  brushSize: number;
  /** How decisively the calmest sector wins. Higher is crisper. */
  sharpness: number;
  /** How far strokes stretch along contours. 0 would be a plain circle. */
  eccentricity: number;
  /** Strength of the noise cleanup before anything else. */
  denoise: number;
};

/**
 * Chosen by looking at the output, not by theory.
 *
 * Sharpness below about 12 lets sectors of similar calmness average together
 * and the picture goes soft; eccentricity below about 2 leaves the strokes
 * too round to follow a contour convincingly. Heavy denoising costs more than
 * it removes, so it is kept light.
 */
export const DEFAULT_SETTINGS: PaintSettings = {
  brushSize: 8,
  sharpness: 14,
  eccentricity: 2,
  denoise: 0.3,
};

export class OilPaintEngine {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private source: WebGLTexture;
  private programs: {
    denoise: WebGLProgram;
    tensor: WebGLProgram;
    tensorBlur: WebGLProgram;
    kuwahara: WebGLProgram;
    output: WebGLProgram;
  };
  private targets: RenderTarget[] = [];
  private disposed = false;

  readonly width: number;
  readonly height: number;

  constructor(image: HTMLCanvasElement | ImageBitmap, width: number, height: number) {
    this.width = width;
    this.height = height;

    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;

    this.gl = createContext(this.canvas);
    this.source = createSourceTexture(this.gl, image);

    this.programs = {
      denoise: createProgram(this.gl, DENOISE_SHADER),
      tensor: createProgram(this.gl, TENSOR_SHADER),
      tensorBlur: createProgram(this.gl, TENSOR_BLUR_SHADER),
      kuwahara: createProgram(this.gl, KUWAHARA_SHADER),
      output: createProgram(this.gl, OUTPUT_SHADER),
    };

    // Four working textures: the denoised image, the tensor, and two the
    // separable blur ping-pongs between.
    for (let i = 0; i < 4; i += 1) {
      this.targets.push(createRenderTarget(this.gl, width, height));
    }
  }

  /** Runs the pipeline and leaves the result on the engine's canvas. */
  render(settings: PaintSettings): HTMLCanvasElement {
    if (this.disposed) throw new GLError("This engine has already been disposed.");

    const { gl, programs } = this;
    const texel: [number, number] = [1 / this.width, 1 / this.height];
    const [image, tensor, blurA, blurB] = this.targets;

    // 1 + 2 — sRGB to linear, and quieten the JPEG noise.
    runPass(gl, programs.denoise, {
      uImage: this.source,
      uTexel: texel,
      uStrength: settings.denoise,
    }, image);

    // 3 — which way the image flows at every pixel.
    runPass(gl, programs.tensor, { uImage: image.texture, uTexel: texel }, tensor);

    // 4 — smooth those directions, horizontally then vertically.
    runPass(gl, programs.tensorBlur, {
      uImage: tensor.texture,
      uTexel: texel,
      uDirection: [1, 0] as [number, number],
    }, blurA);

    runPass(gl, programs.tensorBlur, {
      uImage: blurA.texture,
      uTexel: texel,
      uDirection: [0, 1] as [number, number],
    }, blurB);

    // 5 — the brush strokes.
    runPass(gl, programs.kuwahara, {
      uImage: image.texture,
      uTensor: blurB.texture,
      uTexel: texel,
      uRadius: Math.max(1, settings.brushSize),
      uSharpness: Math.max(0.1, settings.sharpness),
      uEccentricity: Math.max(0, settings.eccentricity),
    }, blurA);

    // 6 — back to sRGB, straight onto the canvas.
    runPass(gl, programs.output, { uImage: blurA.texture }, null);

    // WebGL only queues work; it does not wait for the GPU. Reading a single
    // pixel back blocks until the queue has actually drained, which is the
    // difference between timing the pipeline and timing the act of asking for
    // it. Without this, every render appears to take about a millisecond.
    const pixel = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    return this.canvas;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    const { gl } = this;
    for (const target of this.targets) {
      gl.deleteTexture(target.texture);
      gl.deleteFramebuffer(target.framebuffer);
    }
    this.targets = [];
    gl.deleteTexture(this.source);
    for (const program of Object.values(this.programs)) gl.deleteProgram(program);

    // Tell the driver it can reclaim the context now rather than whenever the
    // garbage collector gets round to it. Browsers cap how many WebGL contexts
    // a page may hold, and the studio creates a new one per photograph.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
