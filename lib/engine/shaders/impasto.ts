/**
 * Pass 5 — thick paint (PROJECT.md 3.2, step 4).
 *
 * Oil paint stands off the canvas. Where the painter loaded the brush the
 * ridge catches the light; beside it there is a thin shadow. That relief is
 * most of what makes a photograph of a painting read as a painting and not
 * as a print, and it costs almost nothing to fake convincingly.
 *
 * The trick is that we already have a height map and do not know it: the
 * brush strokes from the previous pass are flat regions with firm edges, and
 * their brightness stands in perfectly well for how much paint is sitting
 * there. So:
 *
 *   brightness  ->  height  ->  surface normal  ->  light from the upper left
 *
 * Lighting from the upper left is not arbitrary. It is where the light comes
 * from in almost every European painting of the period, and the eye reads
 * any other direction as subtly wrong.
 *
 * The result is blended in soft light rather than added. Adding brightens the
 * whole picture; soft light only steepens what is already there, so the paper
 * white stays white and the shadows stay dark.
 */
export const IMPASTO_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform vec2 uTexel;
uniform float uStrength;

float height(vec2 uv) {
  vec3 c = texture(uImage, uv).rgb;
  // Perceived brightness. Green dominates because the eye does.
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// The W3C soft-light blend, which behaves like a soft spotlight: it steepens
// the existing tone instead of washing over it.
float softLight(float base, float blend) {
  if (blend <= 0.5) {
    return base - (1.0 - 2.0 * blend) * base * (1.0 - base);
  }
  float d = base <= 0.25
    ? ((16.0 * base - 12.0) * base + 4.0) * base
    : sqrt(base);
  return base + (2.0 * blend - 1.0) * (d - base);
}

void main() {
  vec3 colour = texture(uImage, vUv).rgb;

  if (uStrength <= 0.0) {
    fragColor = vec4(colour, 1.0);
    return;
  }

  // Slope of the paint surface, by central difference.
  float hx = height(vUv + vec2(uTexel.x, 0.0)) - height(vUv - vec2(uTexel.x, 0.0));
  float hy = height(vUv + vec2(0.0, uTexel.y)) - height(vUv - vec2(0.0, uTexel.y));

  // How tall the ridges stand. Too high and the picture turns to tinfoil.
  float relief = 6.0 * uStrength;
  vec3 normal = normalize(vec3(-hx * relief, -hy * relief, 1.0));

  // Upper left, slightly in front of the canvas.
  vec3 light = normalize(vec3(-0.55, 0.62, 0.56));

  float diffuse = max(dot(normal, light), 0.0);

  // A narrow highlight along the crest of each ridge: wet oil is glossy.
  vec3 view = vec3(0.0, 0.0, 1.0);
  vec3 halfway = normalize(light + view);
  float specular = pow(max(dot(normal, halfway), 0.0), 48.0) * 0.35;

  // 0.5 is the neutral point of soft light, so this brightens the lit side
  // and darkens the other without shifting the overall exposure.
  float lighting = clamp(0.5 + (diffuse - 0.62) * 0.9 + specular, 0.0, 1.0);

  // PROJECT.md asks for 15-25%; the slider spans that range and a little past.
  float amount = clamp(uStrength, 0.0, 1.0) * 0.28;

  vec3 lit = vec3(
    softLight(clamp(colour.r, 0.0, 1.0), lighting),
    softLight(clamp(colour.g, 0.0, 1.0), lighting),
    softLight(clamp(colour.b, 0.0, 1.0), lighting)
  );

  fragColor = vec4(mix(colour, lit, amount), 1.0);
}`;
