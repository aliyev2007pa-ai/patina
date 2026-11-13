"use client";

/**
 * The last resort: an error in the root layout itself.
 *
 * This replaces the whole document, which is why it draws its own `<html>`
 * and `<body>`. The styling is inline rather than Tailwind on purpose — if
 * the layout failed, the thing that loads the stylesheet is exactly what
 * cannot be relied on, and a bare white page of unstyled text is a worse
 * answer than a plain one that was written to stand alone.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0c",
          color: "#f7f3ea",
          fontFamily: "Georgia, 'Times New Roman', serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#1fb3a6",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Patina
          </p>
          <h1 style={{ fontSize: "28px", fontWeight: 400, marginTop: "20px" }}>
            Patina could not start
          </h1>
          <div
            style={{
              width: "80px",
              height: "1px",
              background: "#c9a227",
              margin: "20px auto",
            }}
          />
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.7,
              color: "#9a968e",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Something failed before the site could draw itself. Reloading
            usually fixes it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "28px",
              padding: "10px 22px",
              border: "none",
              borderRadius: "2px",
              background: "#1fb3a6",
              color: "#0b0b0c",
              fontSize: "14px",
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: "32px",
                fontSize: "11px",
                color: "#9a968e",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Reference {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
