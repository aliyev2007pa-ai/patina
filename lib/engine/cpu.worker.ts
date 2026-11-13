/**
 * The compatibility mode: the same painting, done by the CPU.
 *
 * When a device has no WebGL2 — an old browser, a locked-down machine, a
 * driver the browser has blacklisted — the studio would otherwise be a dead
 * page. This runs instead. It is perhaps fifty times slower and it leaves
 * out the parts that cost the most for the least, but it paints, and a slow
 * painting beats an apology (PROJECT.md 3.1).
 *
 * It runs in a worker because it is slow. On the main thread a render of a
 * few seconds would freeze the page: no scrolling, no cancelling, and on a
 * phone the browser may decide the tab has hung. Here the page stays alive
 * and the work can be thrown away mid-flight.
 *
 * What it keeps: the linear colour space, the denoise, a Kuwahara brush that
 * follows the flow, the ageing curve, the canvas weave and the vignette.
 * What it drops: the second finer pass, bristles and impasto relief — all
 * three multiply the per-pixel cost, and the first thing a slow device needs
 * is to finish.
 */

export type CpuRequest = {
  id: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
  settings: {
    intensity: number;
    brushSize: number;
    sharpness: number;
    eccentricity: number;
    denoise: number;
    warmth: number;
    contrast: number;
    saturation: number;
    canvasTexture: number;
    vignette: number;
  };
};

export type CpuResponse =
  | { id: number; kind: "progress"; done: number }
  | { id: number; kind: "done"; width: number; height: number; pixels: ArrayBuffer }
  | { id: number; kind: "error"; message: string };

const SECTORS = 8;

/** sRGB to linear, for the 256 possible byte values. Built once. */
const TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i += 1) {
  const c = i / 255;
  TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function toSrgbByte(value: number): number {
  const c = value <= 0 ? 0 : value >= 1 ? 1 : value;
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(s * 255);
}

/** The newest request wins; anything older is abandoned at the next row. */
let current = 0;

self.onmessage = (event: MessageEvent<CpuRequest>) => {
  const request = event.data;
  current = request.id;

  try {
    const result = paint(request);
    if (request.id !== current) return;
    const response: CpuResponse = {
      id: request.id,
      kind: "done",
      width: request.width,
      height: request.height,
      pixels: result.buffer as ArrayBuffer,
    };
    (self as unknown as Worker).postMessage(response, [result.buffer as ArrayBuffer]);
  } catch (cause) {
    const response: CpuResponse = {
      id: request.id,
      kind: "error",
      message: cause instanceof Error ? cause.message : "The CPU renderer failed.",
    };
    (self as unknown as Worker).postMessage(response);
  }
};

function paint(request: CpuRequest): Uint8ClampedArray {
  const { width, height, settings } = request;
  const bytes = new Uint8ClampedArray(request.pixels);
  const count = width * height;

  // Linear working copies, one plane per channel: three flat arrays index
  // faster than an array of triples and keep the inner loops tight.
  const r = new Float32Array(count);
  const g = new Float32Array(count);
  const b = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    r[i] = TO_LINEAR[bytes[i * 4]];
    g[i] = TO_LINEAR[bytes[i * 4 + 1]];
    b[i] = TO_LINEAR[bytes[i * 4 + 2]];
  }

  const original = { r: r.slice(), g: g.slice(), b: b.slice() };

  if (settings.denoise > 0) blur3(r, g, b, width, height);

  const { angle, anisotropy } = structureTensor(r, g, b, width, height);

  const outR = new Float32Array(count);
  const outG = new Float32Array(count);
  const outB = new Float32Array(count);

  kuwahara(
    r, g, b, outR, outG, outB,
    angle, anisotropy, width, height,
    Math.max(1, settings.brushSize),
    Math.max(0.1, settings.sharpness),
    Math.max(0, settings.eccentricity),
    request.id
  );

  const out = new Uint8ClampedArray(count * 4);
  const longEdge = Math.max(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      let cr = outR[i];
      let cg = outG[i];
      let cb = outB[i];

      // Ageing, the same shape as the shader's tone pass.
      const pr = Math.pow(Math.max(cr, 0), 1 / 2.2);
      const pg = Math.pow(Math.max(cg, 0), 1 / 2.2);
      const pb = Math.pow(Math.max(cb, 0), 1 / 2.2);
      const luma = pr * 0.2126 + pg * 0.7152 + pb * 0.0722;

      const sat = settings.saturation;
      let tr = luma + (pr - luma) * sat;
      let tg = luma + (pg - luma) * sat;
      let tb = luma + (pb - luma) * sat;

      const t = smoothstep(0.15, 0.85, luma);
      const w = settings.warmth;
      tr *= 1 + w * (lerp(0.92, 1.06, t) - 1);
      tg *= 1 + w * (lerp(0.84, 1.0, t) - 1);
      tb *= 1 + w * (lerp(0.74, 0.84, t) - 1);

      const amount = settings.contrast;
      tr = sCurve(tr, amount);
      tg = sCurve(tg, amount * 0.94);
      tb = sCurve(tb, amount * 0.86);

      cr = Math.pow(Math.max(tr, 0), 2.2);
      cg = Math.pow(Math.max(tg, 0), 2.2);
      cb = Math.pow(Math.max(tb, 0), 2.2);

      // Canvas weave, the same thread count as the shader uses.
      if (settings.canvasTexture > 0) {
        const px = (x / longEdge) * 210;
        const py = (y / longEdge) * 210;
        const u = px - Math.floor(px) - 0.5;
        const v = py - Math.floor(py) - 0.5;
        const over = (Math.floor(px) + Math.floor(py)) % 2;
        const relief = over === 0 ? 1 - 4 * u * u : 1 - 4 * v * v;
        const k = 1 + (relief - 0.5) * 0.16 * settings.canvasTexture;
        cr *= k; cg *= k; cb *= k;
      }

      // Vignette.
      if (settings.vignette > 0) {
        const dx = (x / width - 0.5) * 2 * (width / longEdge);
        const dy = (y / height - 0.5) * 2 * (height / longEdge);
        const d = Math.sqrt(dx * dx + dy * dy);
        const fall = smoothstep(1.35, 0.25, d);
        const k = lerp(1, lerp(0.42, 1, fall), settings.vignette);
        cr *= k; cg *= k; cb *= k;
      }

      const mix = settings.intensity;
      cr = lerp(original.r[i], cr, mix);
      cg = lerp(original.g[i], cg, mix);
      cb = lerp(original.b[i], cb, mix);

      out[i * 4] = toSrgbByte(cr);
      out[i * 4 + 1] = toSrgbByte(cg);
      out[i * 4 + 2] = toSrgbByte(cb);
      out[i * 4 + 3] = 255;
    }
  }

  return out;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function sCurve(x: number, amount: number) {
  const t = Math.min(1, Math.max(0, x));
  return lerp(t, t * t * (3 - 2 * t), amount);
}

/** A 3x3 box blur in place: the denoise, reduced to what it costs least. */
function blur3(
  r: Float32Array, g: Float32Array, b: Float32Array,
  width: number, height: number
) {
  const planes = [r, g, b];
  for (const plane of planes) {
    const copy = plane.slice();
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const i = y * width + x;
        plane[i] =
          (copy[i - width - 1] + copy[i - width] + copy[i - width + 1] +
           copy[i - 1] + copy[i] + copy[i + 1] +
           copy[i + width - 1] + copy[i + width] + copy[i + width + 1]) / 9;
      }
    }
  }
}

/**
 * The direction and strength of the flow at every pixel.
 *
 * Only the angle and the anisotropy are kept, not the three tensor
 * components: both are scale free, so throwing the magnitude away costs
 * nothing and halves what has to be held in memory.
 */
function structureTensor(
  r: Float32Array, g: Float32Array, b: Float32Array,
  width: number, height: number
) {
  const count = width * height;
  const angle = new Float32Array(count);
  const anisotropy = new Float32Array(count);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;

      const gx =
        (r[i + 1] - r[i - 1]) + (g[i + 1] - g[i - 1]) + (b[i + 1] - b[i - 1]);
      const gy =
        (r[i + width] - r[i - width]) +
        (g[i + width] - g[i - width]) +
        (b[i + width] - b[i - width]);

      const e = gx * gx;
      const f = gx * gy;
      const gg = gy * gy;

      // The same stable double-angle form the shader uses.
      angle[i] = 0.5 * Math.atan2(2 * f, e - gg);

      const root = Math.sqrt((e - gg) * (e - gg) + 4 * f * f);
      const sum = e + gg;
      anisotropy[i] = sum > 1e-10 ? root / sum : 0;
    }
  }

  return { angle, anisotropy };
}

function kuwahara(
  r: Float32Array, g: Float32Array, b: Float32Array,
  outR: Float32Array, outG: Float32Array, outB: Float32Array,
  angle: Float32Array, anisotropy: Float32Array,
  width: number, height: number,
  radius: number, sharpness: number, eccentricity: number,
  id: number
) {
  const meanR = new Float32Array(SECTORS);
  const meanG = new Float32Array(SECTORS);
  const meanB = new Float32Array(SECTORS);
  const sqR = new Float32Array(SECTORS);
  const sqG = new Float32Array(SECTORS);
  const sqB = new Float32Array(SECTORS);
  const weight = new Float32Array(SECTORS);

  for (let y = 0; y < height; y += 1) {
    // Abandon the render if a newer one has arrived.
    if (id !== current) return;

    if (y % 32 === 0) {
      const progress: CpuResponse = { id, kind: "progress", done: y / height };
      (self as unknown as Worker).postMessage(progress);
    }

    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;

      const theta = angle[i];
      const ca = Math.cos(theta);
      const sa = Math.sin(theta);
      const alongX = -sa;
      const alongY = ca;

      const stretch = 1 + eccentricity * anisotropy[i];
      const major = Math.max(radius * stretch, 1);
      const minor = Math.max(radius / stretch, 1);

      const spanX = Math.min(Math.ceil(Math.sqrt(major * major * alongX * alongX + minor * minor * ca * ca)), 16);
      const spanY = Math.min(Math.ceil(Math.sqrt(major * major * alongY * alongY + minor * minor * sa * sa)), 16);
      const step = Math.max(1, Math.floor(Math.max(major, minor) / 4));

      meanR.fill(0); meanG.fill(0); meanB.fill(0);
      sqR.fill(0); sqG.fill(0); sqB.fill(0);
      weight.fill(0);

      for (let dy = -spanY; dy <= spanY; dy += step) {
        const sy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -spanX; dx <= spanX; dx += step) {
          const localAlong = (dx * alongX + dy * alongY) / major;
          const localAcross = (dx * ca + dy * sa) / minor;
          const rr = localAlong * localAlong + localAcross * localAcross;
          if (rr > 1) continue;

          const sector = Math.min(
            SECTORS - 1,
            Math.max(0, Math.floor(((Math.atan2(localAcross, localAlong) + Math.PI) / (2 * Math.PI)) * SECTORS))
          );

          const sx = Math.min(width - 1, Math.max(0, x + dx));
          const j = sy * width + sx;
          const w = Math.exp(-3 * rr);

          meanR[sector] += r[j] * w;
          meanG[sector] += g[j] * w;
          meanB[sector] += b[j] * w;
          sqR[sector] += r[j] * r[j] * w;
          sqG[sector] += g[j] * g[j] * w;
          sqB[sector] += b[j] * b[j] * w;
          weight[sector] += w;
        }
      }

      let accR = 0, accG = 0, accB = 0, accW = 0;

      for (let k = 0; k < SECTORS; k += 1) {
        const w = weight[k];
        if (w <= 1e-6) continue;

        const mr = meanR[k] / w;
        const mg = meanG[k] / w;
        const mb = meanB[k] / w;

        const vr = Math.max(sqR[k] / w - mr * mr, 0);
        const vg = Math.max(sqG[k] / w - mg * mg, 0);
        const vb = Math.max(sqB[k] / w - mb * mb, 0);
        const spread = (vr + vg + vb) / 3;

        const sectorWeight = 1 / (1 + Math.pow(spread * 64, 0.5 * sharpness));
        accR += mr * sectorWeight;
        accG += mg * sectorWeight;
        accB += mb * sectorWeight;
        accW += sectorWeight;
      }

      const inv = accW > 1e-6 ? 1 / accW : 0;
      outR[i] = accR * inv;
      outG[i] = accG * inv;
      outB[i] = accB * inv;
    }
  }
}
