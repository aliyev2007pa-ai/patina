"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BeforeAfter from "./BeforeAfter";
import Button from "./Button";
import DropZone from "./DropZone";
import GoldFrame from "./GoldFrame";
import Plaque from "./Plaque";
import Slider from "./Slider";
import { validateImageFile } from "@/lib/image/validate";
import { decodeImage, DecodeError, type DecodedImage } from "@/lib/image/decode";
import {
  DEFAULT_SETTINGS,
  GLError,
  OilPaintEngine,
  type PaintSettings,
} from "@/lib/engine/pipeline";

/** Previews run small so a slider drag feels instant (PROJECT.md 3.4). */
const PREVIEW_EDGE = 1024;

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

export default function Studio() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [settings, setSettings] = useState<PaintSettings>(DEFAULT_SETTINGS);
  const [paintedUrl, setPaintedUrl] = useState<string | null>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const engineRef = useRef<OilPaintEngine | null>(null);
  const paintedUrlRef = useRef<string | null>(null);

  // Keep the newest URL in a ref so the render effect can revoke the previous
  // one without listing it as a dependency and re-running itself.
  useEffect(() => {
    paintedUrlRef.current = paintedUrl;
  }, [paintedUrl]);

  // The engine is built in the file handler rather than in an effect, because
  // building it can fail and the failure has to be reported — and setting
  // state from inside an effect is both a React anti-pattern and a lint
  // error. Here it is just part of handling a click.
  //
  // Which leaves one job for an effect: releasing the last engine when the
  // page goes away. Browsers allow only a handful of live WebGL contexts, and
  // the studio makes a new one for every photograph.
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Re-render 150ms after the sliders stop moving (PROJECT.md 3.4).
  useEffect(() => {
    const engine = engineRef.current;
    if (!loaded || !engine) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const start = performance.now();
        const canvas = engine.render(settings);
        const elapsed = performance.now() - start;

        const url = await toBlobUrl(canvas);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        if (paintedUrlRef.current) URL.revokeObjectURL(paintedUrlRef.current);
        setPaintedUrl(url);
        setRenderMs(Math.round(elapsed));
      } catch (cause) {
        if (!cancelled) {
          setEngineError(
            cause instanceof GLError
              ? cause.message
              : "The painting engine stopped unexpectedly."
          );
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loaded, settings]);

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
      const preview = scaleCanvas(image.canvas, PREVIEW_EDGE);
      const originalUrl = await toBlobUrl(preview);

      engineRef.current?.dispose();
      try {
        engineRef.current = new OilPaintEngine(
          preview,
          preview.width,
          preview.height
        );
      } catch (cause) {
        engineRef.current = null;
        setEngineError(
          cause instanceof GLError
            ? cause.message + " A compatibility mode is coming in a later step."
            : "The painting engine could not start on this device."
        );
      }

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
  }, []);

  const reset = useCallback(() => {
    engineRef.current?.dispose();
    engineRef.current = null;
    setLoaded((previous) => {
      if (previous) URL.revokeObjectURL(previous.originalUrl);
      return null;
    });
    setPaintedUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setRenderMs(null);
    setError(null);
    setEngineError(null);
  }, []);

  const update = (patch: Partial<PaintSettings>) =>
    setSettings((current) => ({ ...current, ...patch }));

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
                  afterSrc={paintedUrl}
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
              style="Anisotropic Kuwahara"
              date="Study"
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

            <div className="space-y-5 rounded-sm border border-white/10 bg-surface/50 p-5">
              <h2 className="font-serif text-lg text-paper">The brush</h2>

              <Slider
                label="Brush size"
                value={settings.brushSize}
                min={2}
                max={16}
                suffix=" px"
                disabled={engineError !== null}
                onChange={(brushSize) => update({ brushSize })}
              />
              <Slider
                label="Sharpness"
                value={settings.sharpness}
                min={1}
                max={18}
                disabled={engineError !== null}
                onChange={(sharpness) => update({ sharpness })}
              />
              <Slider
                label="Stroke along contours"
                value={settings.eccentricity}
                min={0}
                max={3}
                step={0.1}
                disabled={engineError !== null}
                onChange={(eccentricity) => update({ eccentricity })}
              />
              <Slider
                label="Denoise"
                value={settings.denoise}
                min={0}
                max={2}
                step={0.1}
                disabled={engineError !== null}
                onChange={(denoise) => update({ denoise })}
              />

              <button
                type="button"
                onClick={() => setSettings(DEFAULT_SETTINGS)}
                className="text-xs text-muted underline-offset-4 transition-colors duration-200 hover:text-white hover:underline"
              >
                Reset the brush
              </button>
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
              <div className="flex justify-between gap-4">
                <dt>Preview</dt>
                <dd>
                  {loaded.previewWidth} &times; {loaded.previewHeight} px
                </dd>
              </div>
              {renderMs !== null && (
                <div className="flex justify-between gap-4">
                  <dt>Painted in</dt>
                  <dd className="text-turquoise">{renderMs} ms</dd>
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
              Drag the divider to compare. This is the brush step only &mdash;
              thick paint, aged colour, canvas and varnish come next.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
