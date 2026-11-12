"use client";

import { useCallback, useId, useRef, useState } from "react";
import { ACCEPTED_TYPES } from "@/lib/image/validate";

/**
 * Where a photograph comes in: drag and drop, or click to browse.
 *
 * The visible area is a <label> wrapping a hidden file input, so the keyboard
 * and screen readers get a real form control for free — no role juggling, no
 * key handlers, and Tab lands on it in the right order.
 *
 * Dragging fires enter/leave for every child element the cursor crosses, which
 * makes the highlight flicker. Counting enter and leave events instead of
 * tracking a boolean fixes that.
 */
export default function DropZone({
  onFile,
  busy = false,
}: {
  onFile: (file: File) => void;
  busy?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const inputId = useId();

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        depth.current -= 1;
        if (depth.current <= 0) {
          depth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      <label
        htmlFor={inputId}
        aria-busy={busy}
        className={`flex min-h-[18rem] cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed px-6 py-14 text-center transition-colors duration-200 ${
          dragging
            ? "border-turquoise bg-turquoise/5"
            : "border-white/15 bg-surface/40 hover:border-gold-d hover:bg-surface/70"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            // Reset, so choosing the same file twice still fires a change.
            event.target.value = "";
          }}
        />

        <svg
          viewBox="0 0 48 48"
          aria-hidden
          className={`h-10 w-10 transition-colors duration-200 ${
            dragging ? "text-turquoise" : "text-gold-d"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        >
          <rect x="6" y="10" width="36" height="28" rx="1.5" />
          <path d="M6 31l10-9 7 6 8-8 11 10" />
          <circle cx="17" cy="19" r="3" />
        </svg>

        <p className="mt-5 font-serif text-2xl text-paper">
          {busy ? "Reading your photo…" : "Drop a photograph here"}
        </p>
        <p className="mt-2 text-sm text-muted">
          or <span className="text-turquoise">choose a file</span>
        </p>
        <p className="mt-6 text-xs text-muted">
          JPEG, PNG or WebP · up to 10 MB
        </p>
        <p className="mt-1 text-xs text-gold/70">
          It stays on your device — nothing is uploaded.
        </p>
      </label>
    </div>
  );
}
