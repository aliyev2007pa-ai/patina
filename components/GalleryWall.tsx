"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./Button";
import GoldFrame from "./GoldFrame";
import Plaque from "./Plaque";
import {
  GalleryError,
  MAX_PAINTINGS,
  estimate,
  list,
  loadFull,
  remove,
  type PaintingMeta,
} from "@/lib/gallery/store";
import { downloadCanvas, exportName, withFrame } from "@/lib/engine/export";

type Hung = {
  meta: PaintingMeta;
  /** An object URL for the thumbnail, released when this leaves the wall. */
  thumbUrl: string;
};

type Status = "loading" | "ready" | "unavailable";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  // Browsers offer a share of free disk, which is often gigabytes, and
  // "2638.2 MB" is a number nobody reads as an amount of space.
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDate(epoch: number) {
  return new Date(epoch).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * The gallery wall: everything kept in this browser, in gold frames.
 *
 * Only thumbnails are read to build this page (PROJECT.md 2.1) — twenty
 * 400px JPEGs come to about 800KB, where twenty full-size ones would be
 * seven megabytes to scroll past. The full image is fetched only when a
 * painting is opened, which is also the only time anyone needs it.
 *
 * Every object URL made here is released: thumbnails when the wall changes
 * or the page goes away, the opened image when the viewer closes. Blob URLs
 * hold the whole image in memory until revoked, and a gallery is exactly the
 * kind of page people leave open.
 */
export default function GalleryWall() {
  const [status, setStatus] = useState<Status>("loading");
  const [hung, setHung] = useState<Hung[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<{ used: number; quota: number } | null>(
    null
  );

  const [open, setOpen] = useState<PaintingMeta | null>(null);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  // Thumbnail URLs are revoked by id, from whichever handler removed them.
  const urls = useRef(new Map<string, string>());

  const release = useCallback((id: string) => {
    const url = urls.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      urls.current.delete(id);
    }
  }, []);

  /**
   * Reads the wall.
   *
   * Note that this does not check `isAvailable()` first, although it easily
   * could. Doing so would put a `setState` call before the first `await`,
   * which React's lint rule rightly objects to: a state write in the body of
   * an effect causes a second render before the browser has painted the
   * first. The store already refuses to open where storage is switched off,
   * so the check lives there and this only has to read the answer.
   */
  const load = useCallback(async () => {
    try {
      const rows = await list();
      const next = rows.map((meta) => {
        const thumbUrl = URL.createObjectURL(meta.thumb);
        urls.current.set(meta.id, thumbUrl);
        return { meta, thumbUrl };
      });
      const space = await estimate();
      setHung(next);
      setRoom(space);
      setStatus("ready");
    } catch (cause) {
      const blocked =
        cause instanceof GalleryError && cause.code === "UNAVAILABLE";
      setStatus(blocked ? "unavailable" : "ready");
      if (!blocked) {
        setError(
          cause instanceof GalleryError
            ? cause.message
            : "The gallery could not be read."
        );
      }
    }
  }, []);

  useEffect(() => {
    void load();
    const held = urls.current;
    return () => {
      for (const url of held.values()) URL.revokeObjectURL(url);
      held.clear();
    };
  }, [load]);

  // Opening a painting fetches the full-size image it was keeping back.
  const openPainting = useCallback(async (meta: PaintingMeta) => {
    setOpen(meta);
    setConfirming(null);
    setError(null);
    try {
      const blob = await loadFull(meta.id);
      setOpenUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(blob);
      });
    } catch {
      setError("That painting could not be opened.");
    }
  }, []);

  const close = useCallback(() => {
    setOpen(null);
    setConfirming(null);
    setOpenUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }, []);

  // Escape closes the viewer, the way every other overlay on the web does.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  /**
   * Downloads a kept painting, framed on the way out.
   *
   * The frame is added here rather than stored, so the gallery is not holding
   * two copies of the same gold rectangle. `createImageBitmap` decodes off
   * the main thread, which matters at 1600px.
   */
  const download = useCallback(async (meta: PaintingMeta) => {
    setWorking(true);
    setError(null);
    try {
      const blob = await loadFull(meta.id);
      const bitmap = await createImageBitmap(blob);

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
      bitmap.close();

      const framed = withFrame(canvas, {
        title: meta.title,
        style: meta.style,
        date: new Date(meta.savedAt).getFullYear().toString(),
      });

      await downloadCanvas(framed, exportName(meta.title, "jpeg"), "jpeg");
    } catch {
      setError("That painting could not be downloaded.");
    } finally {
      setWorking(false);
    }
  }, []);

  const destroy = useCallback(
    async (id: string) => {
      setWorking(true);
      setError(null);
      try {
        await remove(id);
        release(id);
        setHung((current) => current.filter((item) => item.meta.id !== id));
        setRoom(await estimate());
        setConfirming(null);
        if (open?.id === id) close();
      } catch {
        setError("That painting could not be deleted.");
      } finally {
        setWorking(false);
      }
    },
    [open, close, release]
  );

  if (status === "loading") {
    return (
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="aspect-4/5 animate-pulse rounded-sm bg-surface/50"
          />
        ))}
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <p className="rounded-sm border border-gold-d/60 bg-gold/5 px-5 py-4 text-sm leading-relaxed text-paper">
        This browser is not letting Patina keep anything — a private window
        will do that. Painting and downloading still work exactly as they
        always do.
      </p>
    );
  }

  if (hung.length === 0) {
    return (
      <div className="rounded-sm border border-white/10 bg-surface/50 px-6 py-12 text-center">
        <p className="font-serif text-xl text-paper">
          Nothing on the wall yet
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          Paint a photograph and choose <em>Keep in gallery</em>, and it will
          hang here.
        </p>
        <div className="mt-7 flex justify-center">
          <Button href="/studio" size="lg">
            Go paint something
          </Button>
        </div>
      </div>
    );
  }

  const usedHere = hung.reduce((total, item) => total + item.meta.bytes, 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-white/10 pb-4 text-xs text-muted">
        <p>
          {hung.length} of {MAX_PAINTINGS} kept · {formatBytes(usedHere)}
        </p>
        {room && (
          <p>
            {formatBytes(room.used)} used of about {formatBytes(room.quota)}{" "}
            this browser allows
          </p>
        )}
      </div>

      {error !== null && (
        <p
          role="alert"
          className="mt-5 rounded-sm border border-gold-d/60 bg-gold/5 px-4 py-3 text-xs text-paper"
        >
          {error}
        </p>
      )}

      <ul className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {hung.map(({ meta, thumbUrl }) => (
          <li key={meta.id}>
            <figure>
              <button
                type="button"
                onClick={() => void openPainting(meta)}
                className="block w-full rounded-sm transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none"
                aria-label={`Open ${meta.title}`}
              >
                <GoldFrame>
                  {/* A blob URL cannot go through the image optimiser, and
                      there is nothing to optimise: this file is already a
                      400px JPEG sitting in local storage. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl}
                    alt={meta.title}
                    width={meta.width}
                    height={meta.height}
                    className="block h-auto w-full"
                  />
                </GoldFrame>
              </button>

              <Plaque
                title={meta.title}
                style={meta.style}
                date={new Date(meta.savedAt).getFullYear().toString()}
              />
            </figure>

            <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => void download(meta)}
                disabled={working}
                className="text-turquoise underline-offset-4 transition-colors duration-200 hover:underline disabled:text-muted disabled:no-underline"
              >
                Download
              </button>
              {confirming === meta.id ? (
                <span className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void destroy(meta.id)}
                    disabled={working}
                    className="text-gold underline-offset-4 hover:underline disabled:text-muted"
                  >
                    Delete for good
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="text-muted underline-offset-4 hover:underline"
                  >
                    Keep it
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(meta.id)}
                  className="text-muted underline-offset-4 transition-colors duration-200 hover:text-white hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-ink/95 p-4 sm:p-8"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-3xl"
          >
            {openUrl ? (
              // The picture is capped at 60vh rather than filling the width:
              // a tall painting on a short window would otherwise push the
              // close button off the bottom of the screen, which is how an
              // overlay becomes a trap.
              <GoldFrame className="mx-auto w-fit max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={openUrl}
                  alt={open.title}
                  className="block max-h-[60vh] w-auto max-w-full object-contain"
                />
              </GoldFrame>
            ) : (
              <div className="mx-auto aspect-4/5 h-[60vh] animate-pulse rounded-sm bg-surface/50" />
            )}

            <div className="mt-6 text-center">
              <p className="font-serif text-xl italic text-paper">
                {open.title}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                {open.style} · {open.width} × {open.height} ·{" "}
                {formatDate(open.savedAt)}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button onClick={() => void download(open)} disabled={working}>
                  Download
                </Button>
                <Button onClick={close} variant="secondary">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
