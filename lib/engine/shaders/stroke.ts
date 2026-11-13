/**
 * The hand of the painter.
 *
 * The Kuwahara pass gives flat regions with clean edges, which is halfway to
 * a painting — but only halfway. Its edges are machine-smooth, and the eye
 * reads machine-smooth as "filtered photograph". A loaded brush does not
 * leave a clean edge: it drags, it runs dry, it wobbles, and the boundary
 * between one stroke and the next is ragged at the scale of a bristle.
 *
 * So this pass displaces each pixel a little way ALONG the local flow before
 * reading it, by an amount that wanders. Pulling along the flow rather than
 * in a random direction is what matters: a random push blurs, while a pull
 * along the stroke smears the way a brush does, lengthening strokes and
 * breaking their ends without softening the picture.
 *
 * Two octaves of value noise, the coarse one for the sweep of the hand and
 * the fine one for the bristles.
 */
export const STROKE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform sampler2D uTensor;
uniform vec2 uTexel;
uniform vec2 uAspect;
uniform float uStrength;
uniform float uScale;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Smooth value noise: random at the lattice, interpolated between.
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  if (uStrength <= 0.0) {
    fragColor = texture(uImage, vUv);
    return;
  }

  // The flow direction, recovered the same stable way the brush pass does it.
  vec3 tensor = texture(uTensor, vUv).rgb;
  float theta = 0.5 * atan(2.0 * tensor.y, tensor.x - tensor.z);
  vec2 across = vec2(cos(theta), sin(theta));
  vec2 along = vec2(-across.y, across.x);

  // Noise coordinates in picture space, so the wobble is the same size in the
  // preview and in the full-resolution render.
  vec2 p = vUv * uAspect * uScale;

  float sweep = noise(p) - 0.5;
  float bristle = (noise(p * 3.7 + 19.3) - 0.5) * 0.45;
  float wander = sweep + bristle;

  // A few pixels at most. Beyond that the picture starts to slide.
  float amount = uStrength * 7.0;
  vec2 offset = along * wander * amount * uTexel;

  // Across the stroke, a much smaller nudge: enough to fray the edge, not
  // enough to smear one stroke into its neighbour.
  offset += across * (noise(p * 2.1 + 51.7) - 0.5) * amount * 0.22 * uTexel;

  vec3 colour = texture(uImage, vUv + offset).rgb;

  // Stroke-to-stroke variation, and the reason a filtered photograph still
  // reads as a photograph without it.
  //
  // The brush pass leaves regions perfectly flat. No painter ever laid a flat
  // area: each stroke carries a slightly different load of paint, picks up a
  // little of what is underneath, and sits a shade lighter or darker than the
  // one beside it. Flat colour is the signature of print, not of paint.
  //
  // The noise is sampled in a squashed frame — stretched along the flow and
  // compressed across it — so the variation comes out stroke-shaped rather
  // than as a cloud of blobs.
  vec2 q = vec2(dot(p, along) * 0.30, dot(p, across) * 2.4);
  float tonal = (noise(q) - 0.5) + (noise(q * 2.6 + 13.7) - 0.5) * 0.4;

  // Bristles. A brush is not a blade: it is a few hundred hairs, and each one
  // leaves its own thin furrow down the length of the stroke. Squashing the
  // noise frame hard across the flow and barely at all along it turns the
  // blobs into exactly those furrows.
  //
  // This is written into the colour rather than drawn as lines, because the
  // impasto pass downstream reads brightness as height — so a furrow written
  // here comes back as real relief, lit from the upper left, a moment later.
  vec2 bristleFrame = vec2(dot(p, along) * 0.14, dot(p, across) * 11.0);
  float bristles = (noise(bristleFrame) - 0.5) * 0.55;

  // Paint thins and thickens; it also drifts very slightly warm or cool as
  // the brush picks up its neighbour.
  float load = tonal + bristles;
  colour *= 1.0 + load * 0.17 * uStrength;
  colour += vec3(0.012, 0.004, -0.010) * tonal * uStrength;

  fragColor = vec4(max(colour, vec3(0.0)), 1.0);
}`;
