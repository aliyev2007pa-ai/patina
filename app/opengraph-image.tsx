import { ImageResponse } from "next/og";
import { SITE_TAGLINE } from "@/lib/site";

export const alt = "Patina — Turn your photos into old master oil paintings";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card that appears when somebody pastes a link to this site.
 *
 * Drawn rather than photographed, for the same reason the gold frame in the
 * studio is drawn: it stays exact, weighs nothing, and needs no asset to be
 * kept in step with the palette.
 *
 * No custom font is loaded. Satori, which renders this, needs real font data
 * rather than a family name, so using Cormorant here would mean fetching a
 * font file during the build — a network call that can fail and take the
 * whole deployment with it, in exchange for a nicer `g`. The layout does the
 * work instead.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0c",
          padding: "64px",
        }}
      >
        {/* The frame: gold moulding, dark rebate, warm field — the same three
            layers the real frames on the site are built from. */}
        <div
          style={{
            display: "flex",
            padding: "14px",
            background: "linear-gradient(180deg, #c9a227 0%, #8c6a1a 50%, #c9a227 100%)",
            borderRadius: "2px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#16161a",
              padding: "56px 88px",
              borderRadius: "1px",
            }}
          >
            <div
              style={{
                fontSize: 20,
                letterSpacing: "0.42em",
                color: "#1fb3a6",
                textTransform: "uppercase",
              }}
            >
              Patina
            </div>

            <div
              style={{
                marginTop: 28,
                fontSize: 62,
                lineHeight: 1.15,
                color: "#f7f3ea",
                textAlign: "center",
                maxWidth: 820,
              }}
            >
              {SITE_TAGLINE}
            </div>

            <div
              style={{
                marginTop: 34,
                width: 120,
                height: 2,
                background: "#c9a227",
              }}
            />

            <div
              style={{
                marginTop: 34,
                fontSize: 26,
                color: "#9a968e",
                textAlign: "center",
              }}
            >
              In your browser · No account · Your photo never leaves your device
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
