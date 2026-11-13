"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BeforeAfter from "./BeforeAfter";
import Button from "./Button";
import DropZone from "./DropZone";
import GoldFrame from "./GoldFrame";
import Plaque from "./Plaque";
import PresetPicker from "./PresetPicker";
import Slider from "./Slider";
import Toggle from "./Toggle";
import { validateImageFile } from "@/lib/image/validate";
import { decodeImage, DecodeError, type DecodedImage } from "@/lib/image/decode";
import {
  GLError,
  OilPaintEngine,
  type PaintSettings,
} from "@/lib/engine/pipeline";
import { CpuEngine, isSuperseded } from "@/lib/engine/cpuEngine";
import {
  DEFAULT_PRESET,
  matchPreset,
  presetById,
  type PresetId,
} from "@/lib/engine/presets";
import {
  downloadCanvas,
  exportName,
  withFrame,
  type ExportFormat,
} from "@/lib/engine/export";
import {
  GalleryError,
  isAvailable as galleryAvailable,
  save as keepPainting,
} from "@/lib/gallery/store";

/** Previews run small so a slider drag feels instant (PROJECT.md 3.4). */
const PREVIEW_EDGE = 1024;

/**
 * The CPU renderer works on a much smaller picture. It is tens of times
 * slower per pixel, and a device without WebGL2 is not a fast device; at
 * 1024px a preview would take the best part of a minute, which is not a
 * preview any more.
 */
const CPU_PREVIEW_EDGE = 560;

type Loaded = {
  name: string;
  bytes: number;
  image: DecodedImage;
  /** The photograph at preview size, for the left half of the comparison. */
  originalUrl: string;
  previewWidth: number;
  previewHeight: number;
};

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function toBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(URL.createObjectURL(blob));
      else reject(new Error("The canvas could not be read."));
    }, "image/png");
  });
}

/** Copies a canvas, scaled so its long edge is at most `edge`. */
function scaleCanvas(source: HTMLCanvasElement, edge: number) {
  const scale = Math.min(1, edge / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (context) {
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/** A WebGL canvas is volatile; this takes a plain copy that will keep. */
function snapshot(source: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext("2d")?.drawImage(source, 0, 0);
  return canvas;
}

export default function Studio() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [settings, setSettings] = useState<PaintSettings>(
    presetById(DEFAULT_PRESET).settings
  );
  const [paintedUrl, setPaintedUrl] = useState<string | null>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);

  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [fullMs, setFullMs] = useState<number | null>(null);
  const [rendering, setRendering] = useState(false);

  const [withGoldFrame, setWithGoldFrame] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [compatibility, setCompatibility] = useState(false);
  const [cpuProgress, setCpuProgress] = useState<number | null>(null);

  const [keeping, setKeeping] = useState(false);
  const [kept, setKept] = useState(false);

  const engineRef = useRef<OilPaintEngine | null>(null);
  const cpuRef = useRef<CpuEngine | null>(null);
  /** The photograph at preview size: whichever engine runs, it reads this. */
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintedUrlRef = useRef<string | null>(null);

  const activePreset = useMemo(() => matchPreset(settings), [settings]);

  useEffect(() => {
    paintedUrlRef.current = paintedUrl;
  }, [paintedUrl]);

  // Release the last engine when the page goes away. Browsers allow only a
  // handful of live WebGL contexts and the studio makes one per photograph.
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
      cpuRef.current?.dispose();
      cpuRef.current = null;
    };
  }, []);

  // Re-render 150ms after the controls stop moving (PROJECT.md 3.4).
  useEffect(() => {
    const source = sourceRef.current;
    if (!loaded || !source) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const start = performance.now();

      const publish = async (canvas: HTMLCanvasElement) => {
        previewCanvasRef.current = canvas;
        const url = await toBlobUrl(canvas);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        if (paintedUrlRef.current) URL.revokeObjectURL(paintedUrlRef.current);
        setPaintedUrl(url);
        setRenderMs(Math.round(performance.now() - start));
      };

      try {
        const gl = engineRef.current;
        if (gl) {
          await publish(snapshot(gl.render(settings)));
          return;
        }

        const cpu = cpuRef.current;
        if (!cpu) return;

        setCpuProgress(0);
        const data = await cpu.render(source, settings, (done) => {
          if (!cancelled) setCpuProgress(done);
        });
        if (cancelled) return;

        const canvas = document.createElement("canvas");
        canvas.width = data.width;
        canvas.height = data.height;
        canvas.getContext("2d")?.putImageData(data, 0, 0);
        await publish(canvas);
        setCpuProgress(null);
      } catch (cause) {
        // A render abandoned because a newer one arrived is not a failure.
        if (cancelled || isSuperseded(cause)) return;
        setCpuProgress(null);
        setEngineError(
          cause instanceof GLError
            ? cause.message
            : "The painting engine stopped unexpectedly."
        );
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loaded, settings]);

  /**
   * A full-size render belongs to the settings that produced it. Moving any
   * control makes it stale, so it is thrown away rather than left behind to
   * be downloaded by mistake.
   *
   * This is called from the handlers that change the settings rather than
   * from an effect watching them. An effect would be the obvious place, but
   * setting state inside one causes a second render pass for every change —
   * and here the change always starts with someone touching a control, which
   * is a perfectly good place to do the work.
   */
  const clearFullRender = useCallback(() => {
    fullCanvasRef.current = null;
    // The painting on the wall is now a different painting from the one on
    // screen, so stop claiming this one is kept.
    setKept(false);
    setFullMs(null);
    setFullUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    setEngineError(null);
    setRenderMs(null);

    try {
      const check = await validateImageFile(file);
      if (!check.ok) {
        setError(check.error.message);
        return;
      }

      const image = await decodeImage(file, check.bytes);

      clearFullRender();
      engineRef.current?.dispose();
      cpuRef.current?.dispose();
      engineRef.current = null;
      cpuRef.current = null;

      // Try the graphics card first; fall back to the worker if this device
      // has no WebGL2 to offer.
      let preview = scaleCanvas(image.canvas, PREVIEW_EDGE);
      let onCpu = false;

      try {
        engineRef.current = new OilPaintEngine(
          preview,
          preview.width,
          preview.height
        );
        setEngineError(null);
      } catch (glCause) {
        engineRef.current = null;
        onCpu = true;
        preview = scaleCanvas(image.canvas, CPU_PREVIEW_EDGE);
        try {
          cpuRef.current = new CpuEngine();
          setEngineError(null);
        } catch {
          setEngineError(
            glCause instanceof GLError
              ? glCause.message
              : "The painting engine could not start on this device."
          );
        }
      }

      setCompatibility(onCpu);
      sourceRef.current = preview;
      const originalUrl = await toBlobUrl(preview);

      setPaintedUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });

      setLoaded((previous) => {
        if (previous) URL.revokeObjectURL(previous.originalUrl);
        return {
          name: file.name,
          bytes: file.size,
          image,
          originalUrl,
          previewWidth: preview.width,
          previewHeight: preview.height,
        };
      });
    } catch (cause) {
      setError(
        cause instanceof DecodeError
          ? cause.message
          : "Something went wrong while reading that photo. Try another one."
      );
    } finally {
      setBusy(false);
    }
  }, [clearFullRender]);

  /**
   * Paints the whole photograph, not the preview.
   *
   * The brush is measured in pixels, so it has to be scaled up with the
   * image — otherwise the full render comes back with relatively finer
   * strokes than the preview promised, which is the sort of surprise that
   * makes people stop trusting a preview.
   *
   * A second engine is built and thrown away rather than resizing the first:
   * a 2048px pipeline holds five floating-point textures, around 125MB, and
   * there is no reason to keep that alive while someone drags a slider.
   */
  const renderFull = useCallback(async () => {
    if (!loaded) return;
    setRendering(true);
    setEngineError(null);

    // Let the button repaint as "Painting…" before the GPU blocks the thread.
    await new Promise((resolve) => window.setTimeout(resolve, 30));

    let engine: OilPaintEngine | null = null;
    try {
      const full = loaded.image.canvas;
      const scale =
        Math.max(full.width, full.height) /
        Math.max(loaded.previewWidth, loaded.previewHeight);

      engine = new OilPaintEngine(full, full.width, full.height);

      const start = performance.now();
      const canvas = engine.render({
        ...settings,
        brushSize: settings.brushSize * scale,
      });
      const elapsed = performance.now() - start;

      const copy = snapshot(canvas);
      fullCanvasRef.current = copy;

      const url = await toBlobUrl(copy);
      setFullUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
      setFullMs(Math.round(elapsed));
    } catch (cause) {
      setEngineError(
        cause instanceof GLError
          ? cause.message
          : "The full-size render ran out of room on this device. The preview still works."
      );
    } finally {
      engine?.dispose();
      setRendering(false);
    }
  }, [loaded, settings]);

  const download = useCallback(
    async (format: ExportFormat) => {
      if (!loaded) return;
      const source = fullCanvasRef.current ?? previewCanvasRef.current;
      if (!source) return;

      const title = loaded.name.replace(/\.[^.]+$/, "") || "Untitled";
      const preset = activePreset ? presetById(activePreset).name : "Patina";

      const canvas = withGoldFrame
        ? withFrame(source, {
            title,
            style: preset,
            date: new Date().getFullYear().toString(),
          })
        : source;

      try {
        await downloadCanvas(canvas, exportName(loaded.name, format), format);
      } catch {
        setError("The painting could not be saved. Try the other format.");
      }
    },
    [loaded, withGoldFrame, activePreset]
  );

  /**
   * Puts the painting on the gallery wall.
   *
   * The bare painting is stored, not the framed version: the frame is
   * furniture, and the gallery draws its own around every picture. Downloading
   * from the gallery adds one back on the way out, so nothing is lost by not
   * keeping two copies of the same gold rectangle.
   */
  const keep = useCallback(async () => {
    if (!loaded) return;
    const source = fullCanvasRef.current ?? previewCanvasRef.current;
    if (!source) return;

    setKeeping(true);
    setError(null);
    try {
      await keepPainting(source, {
        title: loaded.name.replace(/\.[^.]+$/, "") || "Untitled",
        style: activePreset ? presetById(activePreset).name : "Adjusted",
      });
      setKept(true);
    } catch (cause) {
      setError(
        cause instanceof GalleryError
          ? cause.message
          : "The painting could not be kept. Downloading still works."
      );
    } finally {
      setKeeping(false);
    }
  }, [loaded, activePreset]);

  const reset = useCallback(() => {
    engineRef.current?.dispose();
    engineRef.current = null;
    cpuRef.current?.dispose();
    cpuRef.current = null;
    sourceRef.current = null;
    setCompatibility(false);
    setCpuProgress(null);
    previewCanvasRef.current = null;
    fullCanvasRef.current = null;
    setLoaded((previous) => {
      if (previous) URL.revokeObjectURL(previous.originalUrl);
      return null;
    });
    setPaintedUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setFullUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setRenderMs(null);
    setFullMs(null);
    setError(null);
    setEngineError(null);
  }, []);

  const update = (patch: Partial<PaintSettings>) => {
    clearFullRender();
    setSettings((current) => ({ ...current, ...patch }));
  };

  const pickPreset = (id: PresetId) => {
    clearFullRender();
    setSettings(presetById(id).settings);
  };

  const off = engineError !== null;
  const canDownload = paintedUrl !== null && !off;
  // A private window will refuse to store anything; there is no point
  // offering a button that cannot work.
  const canKeep = canDownload && !keeping && galleryAvailable();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.3em] text-turquoise">
        Studio
      </p>
      <h1 className="mt-5 text-balance font-serif text-3xl text-paper sm:text-4xl">
        {loaded ? "Your painting" : "Choose a photograph"}
      </h1>
      <div className="mt-5 h-px w-20 bg-gold" />

      {error !== null && (
        <p
          role="alert"
          className="mt-8 rounded-sm border border-gold-d/60 bg-gold/5 px-4 py-3 text-sm text-paper"
        >
          {error}
        </p>
      )}

      {loaded === null ? (
        <>
          <div className="mt-8">
            <DropZone onFile={handleFile} busy={busy} />
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            Tip: portraits with soft, even lighting work best. Photos taken
            sideways on a phone are straightened automatically.
          </p>
        </>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_17rem] lg:items-start">
          <figure>
            <GoldFrame>
              {paintedUrl ? (
                <BeforeAfter
                  beforeSrc={loaded.originalUrl}
                  afterSrc={fullUrl ?? paintedUrl}
                  width={loaded.previewWidth}
                  height={loaded.previewHeight}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={loaded.originalUrl}
                  alt="Your photograph"
                  className="block h-auto w-full"
                />
              )}
            </GoldFrame>
            <Plaque
              title={loaded.name.replace(/\.[^.]+$/, "")}
              style={activePreset ? presetById(activePreset).name : "Adjusted"}
              date={new Date().getFullYear().toString()}
            />
          </figure>

          <aside className="space-y-6">
            {engineError !== null && (
              <p
                role="alert"
                className="rounded-sm border border-gold-d/60 bg-gold/5 px-4 py-3 text-xs leading-relaxed text-paper"
              >
                {engineError}
              </p>
            )}

            {compatibility && engineError === null && (
              <div className="rounded-sm border border-turquoise/40 bg-turquoise/5 px-4 py-3">
                <p className="text-xs leading-relaxed text-paper">
                  Running in compatibility mode. This device has no WebGL2, so
                  the painting is being done by the processor instead of the
                  graphics card — slower, at a smaller size, and without the
                  thick-paint relief.
                </p>
                {cpuProgress !== null && (
                  <div
                    className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-2"
                    role="progressbar"
                    aria-label="Painting"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(cpuProgress * 100)}
                  >
                    <div
                      className="h-full bg-turquoise transition-[width] duration-200"
                      style={{ width: `${Math.round(cpuProgress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 rounded-sm border border-white/10 bg-surface/50 p-5">
              <h2 className="font-serif text-lg text-paper">Take it home</h2>

              <Toggle
                label="Gold frame and plaque"
                checked={withGoldFrame}
                disabled={!canDownload}
                onChange={setWithGoldFrame}
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => download("png")}
                  disabled={!canDownload}
                  className="flex-1"
                >
                  PNG
                </Button>
                <Button
                  onClick={() => download("jpeg")}
                  disabled={!canDownload}
                  variant="secondary"
                  className="flex-1"
                >
                  JPEG
                </Button>
              </div>

              {kept ? (
                <div className="rounded-sm border border-turquoise/40 bg-turquoise/5 px-4 py-3">
                  <p className="text-xs leading-relaxed text-paper">
                    Hung on your wall.{" "}
                    <Link
                      href="/gallery"
                      className="text-turquoise underline-offset-4 hover:underline"
                    >
                      See the gallery
                    </Link>
                  </p>
                </div>
              ) : (
                <Button
                  onClick={keep}
                  disabled={!canKeep}
                  variant="secondary"
                  className="w-full"
                >
                  {keeping ? "Hanging it up…" : "Keep in gallery"}
                </Button>
              )}

              <button
                type="button"
                onClick={renderFull}
                disabled={rendering || off || compatibility}
                className="w-full text-xs text-turquoise underline-offset-4 transition-colors duration-200 hover:underline disabled:text-muted disabled:no-underline"
              >
                {compatibility
                  ? "Full-size rendering needs WebGL2"
                  : rendering
                    ? "Painting at full size…"
                    : fullUrl
                      ? `Full size ready · ${loaded.image.width} × ${loaded.image.height}`
                      : `Render full quality (${loaded.image.width} × ${loaded.image.height})`}
              </button>

              <p className="text-[11px] leading-relaxed text-muted">
                {compatibility
                  ? "Downloads and keeping use the compatibility-mode painting."
                  : fullUrl
                    ? "Downloads and keeping use the full-size painting."
                    : "Downloads and keeping use the preview until you render full quality."}{" "}
                Keeping stores the painting in this browser only — no account,
                nothing uploaded. Download anything you want to keep for good.
              </p>
            </div>

            <PresetPicker
              active={activePreset}
              disabled={off}
              onPick={pickPreset}
            />

            <div className="space-y-5 rounded-sm border border-white/10 bg-surface/50 p-5">
              <h2 className="font-serif text-lg text-paper">The brush</h2>

              <Slider
                label="Intensity"
                value={settings.intensity}
                min={0}
                max={1}
                step={0.05}
                disabled={off}
                onChange={(intensity) => update({ intensity })}
              />
              <Slider
                label="Brush size"
                value={settings.brushSize}
                min={2}
                max={16}
                suffix=" px"
                disabled={off}
                onChange={(brushSize) => update({ brushSize })}
              />
              <Slider
                label="Sharpness"
                value={settings.sharpness}
                min={1}
                max={18}
                disabled={off}
                onChange={(sharpness) => update({ sharpness })}
              />
              <Slider
                label="Stroke along contours"
                value={settings.eccentricity}
                min={0}
                max={3}
                step={0.1}
                disabled={off}
                onChange={(eccentricity) => update({ eccentricity })}
              />
              <Slider
                label="Loose where it is empty"
                value={settings.detailAdapt}
                min={0}
                max={1}
                step={0.05}
                disabled={off}
                onChange={(detailAdapt) => update({ detailAdapt })}
              />
              <Slider
                label="Second, finer pass"
                value={settings.secondPass}
                min={0}
                max={1}
                step={0.05}
                disabled={off}
                onChange={(secondPass) => update({ secondPass })}
              />
              <Slider
                label="Stroke irregularity"
                value={settings.strokeJitter}
                min={0}
                max={1}
                step={0.05}
                disabled={off}
                onChange={(strokeJitter) => update({ strokeJitter })}
              />
              <Slider
                label="Denoise"
                value={settings.denoise}
                min={0}
                max={2}
                step={0.1}
                disabled={off}
                onChange={(denoise) => update({ denoise })}
              />
            </div>

            <div className="space-y-5 rounded-sm border border-white/10 bg-surface/50 p-5">
              <h2 className="font-serif text-lg text-paper">The paint</h2>

              <Slider
                label="Impasto"
                value={settings.impasto}
                min={0}
                max={1}
                step={0.05}
                disabled={off}
                onChange={(impasto) => update({ impasto })}
              />
              <Slider
                label="Warmth"
                value={settings.warmth}
                min={0}
                max={1}
                step={0.05}
                disabled={off}
                onChange={(warmth) => update({ warmth })}
              />
              <Slider
                label="Contrast"
                value={settings.contrast}
                min={0}
                max={1}
                step={0.05}
                disabled={off}
                onChange={(contrast) => update({ contrast })}
              />
              <Slider
                label="Saturation"
                value={settings.saturation}
                min={0}
                max={1.2}
                step={0.05}
                disabled={off}
                onChange={(saturation) => update({ saturation })}
              />
            </div>

            <div className="space-y-5 rounded-sm border border-white/10 bg-surface/50 p-5">
              <h2 className="font-serif text-lg text-paper">The surface</h2>

              <Slider
                label="Canvas texture"
                value={settings.canvasTexture}
                min={0}
                max={1}
                step={0.05}
                disabled={off}
                onChange={(canvasTexture) => update({ canvasTexture })}
              />
              <Slider
                label="Vignette"
                value={settings.vignette}
                min={0}
                max={1}
                step={0.05}
                disabled={off}
                onChange={(vignette) => update({ vignette })}
              />
              <Toggle
                label="Cracks"
                hint="Two centuries of varnish. Heavy-handed on anything modern."
                checked={settings.cracks > 0}
                disabled={off}
                onChange={(on) => update({ cracks: on ? 0.6 : 0 })}
              />
            </div>

            <dl className="space-y-1.5 text-xs text-muted">
              <div className="flex justify-between gap-4">
                <dt>File</dt>
                <dd className="truncate text-paper">{loaded.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Size</dt>
                <dd>{formatBytes(loaded.bytes)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Full size</dt>
                <dd>
                  {loaded.image.width} &times; {loaded.image.height} px
                </dd>
              </div>
              {renderMs !== null && (
                <div className="flex justify-between gap-4">
                  <dt>Preview painted in</dt>
                  <dd className="text-turquoise">{renderMs} ms</dd>
                </div>
              )}
              {fullMs !== null && (
                <div className="flex justify-between gap-4">
                  <dt>Full size painted in</dt>
                  <dd className="text-turquoise">{fullMs} ms</dd>
                </div>
              )}
              {loaded.image.orientation !== 1 && (
                <div className="flex justify-between gap-4">
                  <dt>Rotation</dt>
                  <dd className="text-turquoise">
                    Straightened from EXIF {loaded.image.orientation}
                  </dd>
                </div>
              )}
            </dl>

            <Button onClick={reset} variant="secondary" size="lg" className="w-full">
              Choose another
            </Button>

            <p className="text-xs leading-relaxed text-muted">
              Drag the divider to compare. Nothing has been uploaded — the
              painting was made on this device and stays here.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
