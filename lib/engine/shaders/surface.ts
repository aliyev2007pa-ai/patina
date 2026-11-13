/**
 * Passes 7, 8 and 9 — what the paint is sitting on, and what is on top of it.
 *
 * All three are generated in the shader. Nothing is downloaded, which keeps
 * the promise that the site costs nothing to run and works offline once
 * loaded (PROJECT.md 3.2, steps 6-8).
 *
 * A note on scale that matters more than it sounds: the weave and the cracks
 * are sized as a fraction of the picture, not in pixels. A canvas has a fixed
 * number of threads across it whatever size you print the photograph, so the
 * preview at 1024px and the final render at 2048px must show the same weave —
 * otherwise the picture changes character when you press render.
 */

/** A cheap, stable hash. Same input, same output, on every GPU. */
const HASH = `
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123);
}

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
`;

/**
 * Canvas weave.
 *
 * Linen is two sets of threads crossing at right angles, and the light picks
 * out whichever set is on top at each crossing. Two perpendicular ripples
 * with a checkerboard deciding which one wins gives exactly that, and a
 * little jitter per thread stops it looking like graph paper.
 */
export const CANVAS_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform vec2 uAspect;
uniform float uStrength;
${HASH}

void main() {
  vec3 colour = texture(uImage, vUv).rgb;

  if (uStrength <= 0.0) {
    fragColor = vec4(colour, 1.0);
    return;
  }

  // Thread count across the picture, not across the pixels.
  const float THREADS = 210.0;
  vec2 p = vUv * uAspect * THREADS;

  vec2 cell = floor(p);

  // Each thread is very slightly uneven, as hand-woven linen is.
  float jitterX = (hash1(vec2(cell.y, 7.0)) - 0.5) * 0.22;
  float jitterY = (hash1(vec2(cell.x, 13.0)) - 0.5) * 0.22;

  // A rounded crown across each thread: brightest along its spine, falling
  // away to the gap on either side. A plain sine flips sign from cell to
  // cell, which reads as a checkerboard rather than as thread.
  float u = fract(p.x + jitterX) - 0.5;
  float v = fract(p.y + jitterY) - 0.5;
  float crownX = 1.0 - 4.0 * u * u;
  float crownY = 1.0 - 4.0 * v * v;

  // Which of the two thread sets lies on top at this crossing.
  float over = mod(cell.x + cell.y, 2.0);
  float weave = mix(crownX, crownY, over);

  // A faint slub here and there, where the thread thickens.
  float slub = (hash1(cell) - 0.5) * 0.22;

  float relief = clamp(weave + slub, 0.0, 1.0);

  // Overlay, so the weave darkens the lights and lifts the darks rather than
  // greying the whole picture. PROJECT.md asks for 8-14%.
  float amount = clamp(uStrength, 0.0, 1.0) * 0.16;
  vec3 overlay = mix(
    2.0 * colour * relief,
    1.0 - 2.0 * (1.0 - colour) * (1.0 - relief),
    step(0.5, colour)
  );

  fragColor = vec4(mix(colour, overlay, amount), 1.0);
}`;

/**
 * Craquelure — the web of fine cracks that opens in varnish as it dries and
 * the canvas behind it moves with two centuries of weather.
 *
 * Worley noise is the right tool: scatter points, and ask each pixel how far
 * it is from the nearest two. Where those distances are nearly equal the
 * pixel sits on a boundary between cells — which is precisely the shape a
 * crack network has, because cracks form along the edges of the plates the
 * surface has broken into.
 *
 * Off by default. On a modern face it reads as damage rather than age, so
 * only the Aged Canvas preset turns it on (PROJECT.md 3.2, step 7).
 */
export const CRAQUELURE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform vec2 uAspect;
uniform float uStrength;
${HASH}

// Distance to the nearest two scattered points.
vec2 worley(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);

  float nearest = 8.0;
  float second = 8.0;

  for (int j = -1; j <= 1; ++j) {
    for (int i = -1; i <= 1; ++i) {
      vec2 neighbour = vec2(float(i), float(j));
      vec2 point = neighbour + hash2(cell + neighbour) - local;
      float d = length(point);

      if (d < nearest) {
        second = nearest;
        nearest = d;
      } else if (d < second) {
        second = d;
      }
    }
  }

  return vec2(nearest, second);
}

void main() {
  vec3 colour = texture(uImage, vUv).rgb;

  if (uStrength <= 0.0) {
    fragColor = vec4(colour, 1.0);
    return;
  }

  const float CELLS = 46.0;
  vec2 p = vUv * uAspect * CELLS;

  // Two scales: a coarse network of long cracks, and a finer one inside it.
  vec2 coarse = worley(p);
  vec2 fine = worley(p * 2.7 + 31.4);

  float edgeCoarse = coarse.y - coarse.x;
  float edgeFine = fine.y - fine.x;

  // Thin where the two distances nearly match: that is the cell boundary.
  float crack = 1.0 - smoothstep(0.0, 0.055, edgeCoarse);
  crack = max(crack, (1.0 - smoothstep(0.0, 0.030, edgeFine)) * 0.55);

  // Cracks open more in thickly painted lights than in thin dark grounds.
  float luma = dot(colour, vec3(0.2126, 0.7152, 0.0722));
  crack *= mix(0.45, 1.0, smoothstep(0.05, 0.6, luma));

  // A dark line with a faint pale lip on one side, the way a real crack
  // catches the light along its raised edge.
  float amount = clamp(uStrength, 0.0, 1.0) * 0.5;
  vec3 darkened = colour * (1.0 - crack * 0.55 * amount);
  float lip = (1.0 - smoothstep(0.045, 0.10, edgeCoarse)) - crack;
  darkened += vec3(0.05, 0.045, 0.035) * max(lip, 0.0) * amount;

  fragColor = vec4(darkened, 1.0);
}`;

/**
 * Varnish and vignette — the last thing the eye notices and the first thing
 * that gives the game away when it is overdone (PROJECT.md 3.2, step 8).
 *
 * Two effects, both deliberately slight. The corners fall away, because a
 * painting lit from the front on a dark wall is always darker at its edges.
 * And the centre warms very faintly, because aged varnish is a yellow film
 * that is thickest where the brush loaded it.
 *
 * The vignette is elliptical, matched to the picture's aspect, so a wide
 * photograph does not end up with a circular hole burnt in the middle.
 */
export const VARNISH_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform vec2 uAspect;
uniform float uStrength;

void main() {
  vec3 colour = texture(uImage, vUv).rgb;

  if (uStrength <= 0.0) {
    fragColor = vec4(colour, 1.0);
    return;
  }

  // Distance from the centre, corrected so the falloff follows the frame.
  vec2 offset = (vUv - 0.5) * normalize(uAspect) * 2.0;
  float d = length(offset);

  // 1 in the middle, falling off towards the corners.
  float fall = smoothstep(1.35, 0.25, d);

  float amount = clamp(uStrength, 0.0, 1.0);
  vec3 shaded = colour * mix(1.0, mix(0.42, 1.0, fall), amount);

  // The warm bloom of old varnish, strongest at the centre. Kept tiny:
  // anything you can clearly see here looks amateurish.
  vec3 varnish = vec3(0.055, 0.040, 0.014);
  shaded += varnish * pow(fall, 2.0) * amount * 0.5;

  fragColor = vec4(shaded, 1.0);
}`;
