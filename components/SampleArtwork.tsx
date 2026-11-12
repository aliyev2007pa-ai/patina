/**
 * Placeholder "before / after" example for the landing page.
 *
 * Drawn as inline SVG on purpose: nothing to download, no layout shift, and it
 * stays sharp at any size. FAZ 3 replaces it with two real photographs once
 * the engine can actually produce the right-hand side.
 *
 * Left half is the photograph (cool, flat, even). Right half is what Patina is
 * aiming at: warm highlights, umber shadows, a canvas weave over the top.
 */
function Figure({
  bgTop,
  bgBottom,
  skin,
  skinShadow,
  hair,
  cloth,
}: {
  bgTop: string;
  bgBottom: string;
  skin: string;
  skinShadow: string;
  hair: string;
  cloth: string;
}) {
  return (
    <>
      <rect x="0" y="0" width="480" height="600" fill={`url(#${bgTop})`} />
      <rect x="0" y="0" width="480" height="600" fill={`url(#${bgBottom})`} />
      {/* shoulders */}
      <path d="M90 600 Q110 440 240 428 Q370 440 390 600 Z" fill={cloth} />
      {/* neck */}
      <path d="M205 380 h70 v60 q-35 22 -70 0 Z" fill={skinShadow} />
      {/* head */}
      <ellipse cx="240" cy="290" rx="92" ry="112" fill={skin} />
      {/* shadow side of the face */}
      <path
        d="M240 178 a92 112 0 0 1 0 224 a74 112 0 0 0 0 -224 Z"
        fill={skinShadow}
        opacity="0.75"
      />
      {/* hair */}
      <path
        d="M148 288 Q142 168 240 164 Q338 168 332 288 Q320 232 240 222 Q160 232 148 288 Z"
        fill={hair}
      />
    </>
  );
}

export default function SampleArtwork({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 480 600"
      className={className}
      role="img"
      aria-label="Example: a portrait photograph on the left, the same portrait rendered as an oil painting on the right."
    >
      <defs>
        <linearGradient id="coolTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3f47" />
          <stop offset="100%" stopColor="#1b1d22" />
        </linearGradient>
        <linearGradient id="coolBottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="#101216" />
        </linearGradient>
        <linearGradient id="warmTop" x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#5a4320" />
          <stop offset="60%" stopColor="#241a0c" />
          <stop offset="100%" stopColor="#120c05" />
        </linearGradient>
        <linearGradient id="warmBottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="#0b0702" />
        </linearGradient>

        {/* Procedural canvas weave — the same idea the real shader uses. */}
        <filter id="weave" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            result="noise"
          />
          <feColorMatrix type="saturate" values="0" in="noise" result="grey" />
        </filter>

        <clipPath id="leftHalf">
          <rect x="0" y="0" width="240" height="600" />
        </clipPath>
        <clipPath id="rightHalf">
          <rect x="240" y="0" width="240" height="600" />
        </clipPath>

        <radialGradient id="vignette" cx="0.5" cy="0.42" r="0.75">
          <stop offset="55%" stopColor="transparent" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.75" />
        </radialGradient>
      </defs>

      <g clipPath="url(#leftHalf)">
        <Figure
          bgTop="coolTop"
          bgBottom="coolBottom"
          skin="#9a9ba0"
          skinShadow="#74767c"
          hair="#3c3f46"
          cloth="#2a2d33"
        />
      </g>

      <g clipPath="url(#rightHalf)">
        <Figure
          bgTop="warmTop"
          bgBottom="warmBottom"
          skin="#d9b981"
          skinShadow="#9a7239"
          hair="#3f2611"
          cloth="#241603"
        />
        <rect
          x="240"
          y="0"
          width="240"
          height="600"
          filter="url(#weave)"
          opacity="0.12"
          style={{ mixBlendMode: "overlay" }}
        />
        <rect x="240" y="0" width="240" height="600" fill="url(#vignette)" />
      </g>

      {/* the seam between the two halves */}
      <line x1="240" y1="0" x2="240" y2="600" stroke="#c9a227" strokeWidth="1.5" />

      <text
        x="20"
        y="572"
        fill="#9a968e"
        fontSize="15"
        letterSpacing="4"
        fontFamily="var(--font-inter), sans-serif"
      >
        PHOTO
      </text>
      <text
        x="460"
        y="572"
        fill="#c9a227"
        fontSize="15"
        letterSpacing="4"
        textAnchor="end"
        fontFamily="var(--font-inter), sans-serif"
      >
        PATINA
      </text>
    </svg>
  );
}
