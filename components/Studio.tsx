"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./Button";
import DropZone from "./DropZone";
import GoldFrame from "./GoldFrame";
import { validateImageFile } from "@/lib/image/validate";
import { decodeImage, DecodeError, type DecodedImage } from "@/lib/image/decode";

type Loaded = {
  name: string;
  bytes: number;
  image: DecodedImage;
  previewUrl: string;
};

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * The studio, as far as FAZ 2 goes: take a photograph in, prove it was read
 * correctly, and show it. No painting yet — that is FAZ 3.
 *
 * The decoded canvas is kept in a ref rather than in state. React never needs
 * to re-render because of it, and FAZ 3 will hand exactly this canvas to WebGL
 * as the source texture.
 */
export default function Studio() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // An object URL is a reference to memory the browser holds for us; it has to
  // be handed back, or the photo stays in memory for the life of the tab.
  useEffect(() => {
    return () => {
      if (loaded) URL.revokeObjectURL(loaded.previewUrl);
    };
  }, [loaded]);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);

    try {
      const check = await validateImageFile(file);
      if (!check.ok) {
        setError(check.error.message);
        return;
      }

      const image = await decodeImage(file, check.bytes);

      const blob = await new Promise<Blob | null>((resolve) =>
        image.canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new DecodeError("The photo could not be prepared for display.");

      canvasRef.current = image.canvas;
      setLoaded((previous) => {
        if (previous) URL.revokeObjectURL(previous.previewUrl);
        return {
          name: file.name,
          bytes: file.size,
          image,
          previewUrl: URL.createObjectURL(blob),
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
    setLoaded((previous) => {
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      return null;
    });
    canvasRef.current = null;
    setError(null);
  }, []);

  const wasResized =
    loaded !== null &&
    (loaded.image.sourceWidth !== loaded.image.width ||
      loaded.image.sourceHeight !== loaded.image.height);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.3em] text-turquoise">
        Studio
      </p>
      <h1 className="mt-5 text-balance font-serif text-3xl text-paper sm:text-4xl">
        {loaded ? "Your photograph" : "Choose a photograph"}
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
            Tip: portraits with soft, even lighting turn out best. Photos taken
            sideways on a phone are straightened automatically.
          </p>
        </>
      ) : (
        <div className="mt-8">
          <GoldFrame className="mx-auto max-w-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={loaded.previewUrl}
              alt={`Your photograph, ${loaded.image.width} by ${loaded.image.height} pixels`}
              width={loaded.image.width}
              height={loaded.image.height}
              className="block h-auto w-full"
            />
          </GoldFrame>

          <dl className="mx-auto mt-6 max-w-xl space-y-1.5 border-t border-gold-d/40 pt-4 text-xs text-muted">
            <div className="flex justify-between gap-4">
              <dt>File</dt>
              <dd className="truncate text-paper">{loaded.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Size</dt>
              <dd>{formatBytes(loaded.bytes)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Working size</dt>
              <dd>
                {loaded.image.width} × {loaded.image.height} px
                {wasResized && (
                  <span className="text-muted">
                    {" "}
                    (from {loaded.image.sourceWidth} × {loaded.image.sourceHeight})
                  </span>
                )}
              </dd>
            </div>
            {loaded.image.orientation !== 1 && (
              <div className="flex justify-between gap-4">
                <dt>Rotation</dt>
                <dd className="text-turquoise">
                  Straightened from EXIF {loaded.image.orientation}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button onClick={reset} variant="secondary" size="lg">
              Choose another
            </Button>
          </div>

          <p className="mt-8 text-center text-xs text-muted">
            The painting engine arrives next. This photograph has not left your
            device — and it will not.
          </p>
        </div>
      )}
    </div>
  );
}
