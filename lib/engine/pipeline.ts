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
import { IMPASTO_SHADER } from "./shaders/impasto";
import { TONE_SHADER } from "./shaders/tone";
import {
  CANVAS_SHADER,
  CRAQUELURE_SHADER,
  VARNISH_SHADER,
} from "./shaders/surface";
import { OUTPUT_SHADER } from "./shaders/output";

export { GLError };

/**
 * The paint engine: the nine steps of PROJECT.md 3.2, in order.
 *
 * The engine is built once per photograph and reused for every re-render, so
 * dragging a slider recompiles nothing and reuploads nothing — it just runs
 * the passes again over textures that are already on the card. Everything it
 * allocates is released by `dispose`.
 */

export type PaintSettings = {
  /** How much of the painting shows through over the photograph. */
  intensity: number;
  /** Brush size in pixels (PROJECT.md 3.4). */
  brushSize: number;
  /** How decisively the calmest sector wins. Higher is crisper. */
  sharpness: number;
  /** How far strokes stretch along contours. 0 would be a plain circle. */
  eccentricity: number;
  /** Noise cleanup before anything else. */
  denoise: number;
  /** Relief of the paint surface. */
  impasto: number;
  /** Aged varnish: cream lights, umber shadows, lifted blacks. */
  warmth: number;
  /** Strength of the chiaroscuro S-curve. */
  contrast: number;
  /** How far the colour is pulled back towards period pigments. */
  saturation: number;
  /** Visibility of the woven linen underneath. */
  canvasTexture: number;
  /** Darkened corners and the warm bloom at the centre. */
  vignette: number;
  /** The web of fine cracks. Off unless the picture wants to look damaged. */
  cracks: number;
};

/**
 * Chosen by looking at the output, not by theory.
 *
 * Sharpness below about 12 lets sectors of similar calmness average together
 * and the picture goes soft; eccentricity below about 2 leaves the strokes
 * too round to follow a contour convincingly. Heavy denoising costs more than
 * it removes, so it is kept light. Cracks start off, because on a modern face
 * they read as damage rather than age.
 */
export const DEFAULT_SETTINGS: PaintSettings = {
  intensity: 1,
  brushSize: 8,
  sharpness: 14,
  eccentricity: 2,
  denoise: 0.3,
  impasto: 0.6,
  warmth: 0.7,
  contrast: 0.45,
  saturation: 0.85,
  canvasTexture: 0.55,
  vignette: 0.5,
  cracks: 0,
};

export class OilPaintEngine {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private source: WebGLTexture;
  private programs: Record<string, WebGLProgram>;
  private targets: RenderTarget[] = [];
  private disposed = false;

  readonly width: number;
  readonly height: number;

  constructor(
    image: HTMLCanvasElement | ImageBitmap,
    width: number,
    height: number
  ) {
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
      impasto: createProgram(this.gl, IMPASTO_SHADER),
      tone: createProgram(this.gl, TONE_SHADER),
      canvasWeave: createProgram(this.gl, CANVAS_SHADER),
      craquelure: createProgram(this.gl, CRAQUELURE_SHADER),
      varnish: createProgram(this.gl, VARNISH_SHADER),
      output: createProgram(this.gl, OUTPUT_SHADER),
    };

    // Five working textures. The first holds the denoised photograph all the
    // way through, because the final blend needs it; the rest are scratch and
    // get reused as the passes march along.
    for (let i = 0; i < 5; i += 1) {
      this.targets.push(createRenderTarget(this.gl, width, height));
    }
  }

  /** Runs the pipeline and leaves the result on the engine's canvas. */
  render(settings: PaintSettings): HTMLCanvasElement {
    if (this.disposed) {
      throw new GLError("This engine has already been disposed.");
    }

    const { gl, programs } = this;
    const texel: [number, number] = [1 / this.width, 1 / this.height];

    // Normalised so the longer edge is 1. The weave, the cracks and the
    // vignette all use this, which is what keeps them the same shape in the
    // preview and in the full-size render.
    const longEdge = Math.max(this.width, this.height);
    const aspect: [number, number] = [
      this.width / longEdge,
      this.height / longEdge,
    ];

    const [photo, a, b, c, d] = this.targets;

    // 1 + 2 — sRGB to linear, and quieten the JPEG noise.
    runPass(gl, programs.denoise, {
      uImage: this.source,
      uTexel: texel,
      uStrength: settings.denoise,
    }, photo);

    // 3 — which way the image flows at every pixel.
    runPass(gl, programs.tensor, { uImage: photo.texture, uTexel: texel }, a);

    // 4 — smooth those directions, horizontally then vertically.
    runPass(gl, programs.tensorBlur, {
      uImage: a.texture,
      uTexel: texel,
      uDirection: [1, 0] as [number, number],
    }, b);
    runPass(gl, programs.tensorBlur, {
      uImage: b.texture,
      uTexel: texel,
      uDirection: [0, 1] as [number, number],
    }, c);

    // 5 — the brush strokes.
    runPass(gl, programs.kuwahara, {
      uImage: photo.texture,
      uTensor: c.texture,
      uTexel: texel,
      uRadius: Math.max(1, settings.brushSize),
      uSharpness: Math.max(0.1, settings.sharpness),
      uEccentricity: Math.max(0, settings.eccentricity),
    }, a);

    // 6 — thick paint catching the light.
    runPass(gl, programs.impasto, {
      uImage: a.texture,
      uTexel: texel,
      uStrength: settings.impasto,
    }, b);

    // 7 — the colour of age.
    runPass(gl, programs.tone, {
      uImage: b.texture,
      uWarmth: settings.warmth,
      uContrast: settings.contrast,
      uSaturation: settings.saturation,
    }, c);

    // 8 — the woven linen underneath.
    runPass(gl, programs.canvasWeave, {
      uImage: c.texture,
      uAspect: aspect,
      uStrength: settings.canvasTexture,
    }, d);

    // 9 — cracks, when asked for. Skipped entirely at zero rather than run
    // with no effect, which saves a full pass on every re-render.
    let surface = d;
    if (settings.cracks > 0) {
      runPass(gl, programs.craquelure, {
        uImage: d.texture,
        uAspect: aspect,
        uStrength: settings.cracks,
      }, b);
      surface = b;
    }

    // 10 — varnish and vignette.
    runPass(gl, programs.varnish, {
      uImage: surface.texture,
      uAspect: aspect,
      uStrength: settings.vignette,
    }, a);

    // 11 — blend with the photograph, back to sRGB, onto the canvas.
    runPass(gl, programs.output, {
      uImage: a.texture,
      uOriginal: photo.texture,
      uIntensity: settings.intensity,
    }, null);

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
