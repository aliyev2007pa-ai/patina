/**
 * Keeping paintings, on the visitor's own machine.
 *
 * PROJECT.md 5 planned this as rows in Postgres and files in Supabase
 * Storage. It is IndexedDB instead, and the reason is worth writing down.
 *
 * Patina's best property is the one on its landing page: the photograph never
 * leaves the device. A server-side gallery would have made that sentence
 * untrue the moment anyone used it — and would have put other people's
 * photographs in a free-tier bucket that pauses after a week of quiet
 * (PROJECT.md 2.2). Storing them here keeps the promise whole, costs nothing
 * forever, and needs no account, no password and no email.
 *
 * The honest cost: a gallery belongs to one browser on one machine. Clearing
 * site data empties it. So this is a shelf, not a safe — downloading is still
 * the way to keep a painting, and the gallery says so.
 *
 * The quota rules from PROJECT.md 2.1 are kept exactly as written, because
 * they were good rules for reasons that have nothing to do with Supabase:
 * 1600px long edge at JPEG 0.82, a separate 400px thumbnail, and twenty
 * paintings at most. The grid reads only thumbnails, so opening the gallery
 * costs about 800KB rather than seven megabytes.
 */

const DB_NAME = "patina";
const DB_VERSION = 1;

/** Metadata plus the thumbnail: everything the grid needs, nothing more. */
const META = "paintings";
/** Full-size images, read only when one painting is opened. */
const IMAGES = "images";

/** PROJECT.md 2.1. */
export const MAX_PAINTINGS = 20;
const SAVE_EDGE = 1600;
const SAVE_QUALITY = 0.82;
const THUMB_EDGE = 400;
const THUMB_QUALITY = 0.78;

export type PaintingMeta = {
  id: string;
  title: string;
  /** The preset it was painted with, for the plaque. */
  style: string;
  savedAt: number;
  width: number;
  height: number;
  /** Size of the full-size JPEG, so the gallery can be honest about space. */
  bytes: number;
  thumb: Blob;
};

type StoredImage = {
  id: string;
  full: Blob;
};

export type GalleryErrorCode =
  /** Twenty paintings already kept. */
  | "FULL"
  /** No IndexedDB: private windows and locked-down browsers do this. */
  | "UNAVAILABLE"
  /** The browser refused to store more — usually a full disk. */
  | "NO_ROOM"
  /** Anything else, which should not happen but will. */
  | "FAILED";

export class GalleryError extends Error {
  constructor(
    readonly code: GalleryErrorCode,
    message: string
  ) {
    super(message);
    this.name = "GalleryError";
  }
}

/**
 * Whether this browser will let us keep anything at all.
 *
 * Reading `window.indexedDB` can itself throw where storage is disabled, so
 * even the check is wrapped.
 */
export function isAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

function open(): Promise<IDBDatabase> {
  if (!isAvailable()) {
    throw new GalleryError(
      "UNAVAILABLE",
      "This browser is not letting Patina store anything. Painting and downloading still work."
    );
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META)) {
        const store = db.createObjectStore(META, { keyPath: "id" });
        // The gallery is always newest-first, so let the database do the
        // sorting rather than loading everything and sorting in JavaScript.
        store.createIndex("savedAt", "savedAt");
      }
      if (!db.objectStoreNames.contains(IMAGES)) {
        db.createObjectStore(IMAGES, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () =>
      reject(
        new GalleryError(
          "UNAVAILABLE",
          "Patina could not open its gallery storage. A private window will do this."
        )
      );

    // Another tab holding an older version open. Rare, and it resolves itself
    // when that tab closes, so say something true rather than hanging.
    request.onblocked = () =>
      reject(
        new GalleryError(
          "FAILED",
          "Another Patina tab is busy with the gallery. Close it and try again."
        )
      );
  });
}

/** Wraps a request so a transaction's failure becomes a rejected promise. */
function wrap<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Every painting kept here, newest first — thumbnails only.
 *
 * `openCursor(null, "prev")` walks the savedAt index backwards, which is the
 * order the wall hangs them in.
 */
export async function list(): Promise<PaintingMeta[]> {
  const db = await open();
  try {
    const transaction = db.transaction(META, "readonly");
    const index = transaction.objectStore(META).index("savedAt");
    const rows = await wrap(index.getAll());
    return (rows as PaintingMeta[]).sort((a, b) => b.savedAt - a.savedAt);
  } finally {
    db.close();
  }
}

/** Copies a canvas, scaled so its long edge is at most `edge`. */
function scaled(source: HTMLCanvasElement, edge: number): HTMLCanvasElement {
  const factor = Math.min(1, edge / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * factor));
  canvas.height = Math.max(1, Math.round(source.height * factor));
  const context = canvas.getContext("2d");
  if (context) {
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else
          reject(
            new GalleryError("FAILED", "The painting could not be prepared.")
          );
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Keeps a painting, and hands back the row the gallery will show.
 *
 * The count is checked twice: once before the expensive encoding, so nobody
 * waits for a JPEG that is about to be refused, and once inside the write
 * transaction, which is the check that actually holds. IndexedDB serialises
 * transactions, so the second one cannot be raced by another tab.
 *
 * Both stores are written in one transaction. If the full image fails to
 * store, the metadata rolls back with it rather than leaving a frame on the
 * wall with no painting in it.
 */
export async function save(
  painting: HTMLCanvasElement,
  details: { title: string; style: string }
): Promise<PaintingMeta> {
  const db = await open();

  try {
    const existing = await wrap(
      db.transaction(META, "readonly").objectStore(META).count()
    );
    if (existing >= MAX_PAINTINGS) {
      throw new GalleryError(
        "FULL",
        `You have ${MAX_PAINTINGS} paintings kept. Delete one to keep a new one.`
      );
    }

    const keep = scaled(painting, SAVE_EDGE);
    const full = await toJpeg(keep, SAVE_QUALITY);
    const thumb = await toJpeg(scaled(painting, THUMB_EDGE), THUMB_QUALITY);

    const meta: PaintingMeta = {
      id: newId(),
      title: details.title.slice(0, 80) || "Untitled",
      style: details.style,
      savedAt: Date.now(),
      width: keep.width,
      height: keep.height,
      bytes: full.size,
      thumb,
    };

    const image: StoredImage = { id: meta.id, full };

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([META, IMAGES], "readwrite");
      const metaStore = transaction.objectStore(META);

      const counted = metaStore.count();
      counted.onsuccess = () => {
        if (counted.result >= MAX_PAINTINGS) {
          transaction.abort();
          reject(
            new GalleryError(
              "FULL",
              `You have ${MAX_PAINTINGS} paintings kept. Delete one to keep a new one.`
            )
          );
          return;
        }
        metaStore.put(meta);
        transaction.objectStore(IMAGES).put(image);
      };

      transaction.oncomplete = () => resolve();
      transaction.onabort = () => {
        const cause = transaction.error;
        // A full disk arrives here, not at the put call.
        if (cause?.name === "QuotaExceededError") {
          reject(
            new GalleryError(
              "NO_ROOM",
              "This device is out of storage room. Delete a painting, or download this one instead."
            )
          );
        } else if (cause) {
          reject(
            new GalleryError("FAILED", "The painting could not be kept.")
          );
        }
        // No error means we aborted deliberately above and already rejected.
      };
    });

    return meta;
  } finally {
    db.close();
  }
}

/** The full-size JPEG for one painting, for viewing or downloading. */
export async function loadFull(id: string): Promise<Blob> {
  const db = await open();
  try {
    const row = await wrap(
      db.transaction(IMAGES, "readonly").objectStore(IMAGES).get(id)
    );
    const image = row as StoredImage | undefined;
    if (!image) {
      throw new GalleryError("FAILED", "That painting is no longer here.");
    }
    return image.full;
  } finally {
    db.close();
  }
}

/** Removes a painting and its image together. */
export async function remove(id: string): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([META, IMAGES], "readwrite");
      transaction.objectStore(META).delete(id);
      transaction.objectStore(IMAGES).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(new GalleryError("FAILED", "That painting could not be deleted."));
    });
  } finally {
    db.close();
  }
}

/**
 * How much room the browser has given this site, if it will say.
 *
 * Browsers report a share of free disk rather than a fixed figure, and some
 * refuse to answer at all, so every caller has to cope with null.
 */
export async function estimate(): Promise<{
  used: number;
  quota: number;
} | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage, quota } = await navigator.storage.estimate();
    if (usage === undefined || quota === undefined) return null;
    return { used: usage, quota };
  } catch {
    return null;
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // randomUUID needs a secure context. Uniqueness is all that matters here.
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
