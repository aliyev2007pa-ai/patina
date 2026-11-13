/**
 * Pass 6 — the colour of age (PROJECT.md 3.2, step 5).
 *
 * This is where a clean modern photograph starts to look like something that
 * has hung on a wall for two hundred years. Four things are happening, and
 * each of them is a real property of old paintings rather than a filter:
 *
 * 1. **Less saturation.** Period pigments were earths and minerals. There was
 *    no cadmium red, no phthalo blue. Nothing in the palette could reach the
 *    saturation an ordinary phone camera produces.
 *
 * 2. **Split toning.** Varnish yellows as it ages, so the lights drift to
 *    cream. Shadows in oil were mixed from umber and bone black and lean
 *    brown, never neutral grey. Tinting lights and shadows apart is most of
 *    the effect.
 *
 * 3. **Lifted blacks.** A varnished surface scatters light, so nothing in a
 *    real painting is as dark as a photograph's black. Leaving pure black in
 *    place is the single clearest giveaway that an image was faked.
 *
 * 4. **An S-curve.** Chiaroscuro: the midtones separate, the extremes
 *    compress. This is what gives the dramatic light those painters are
 *    remembered for.
 *
 * All of it happens in linear light, so the curve shapes are applied to a
 * perceptual encoding first and undone afterwards — otherwise an S-curve in
 * linear space crushes the shadows into mud.
 */
export const TONE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform float uWarmth;    // 0 = untouched, 1 = heavily aged varnish
uniform float uContrast;  // strength of the S-curve
uniform float uSaturation;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

// The colours the lights and shadows are pulled towards. Cream and umber:
// the two ends of almost every old master palette.
const vec3 HIGHLIGHT_TINT = vec3(1.06, 1.00, 0.84);
const vec3 SHADOW_TINT    = vec3(0.92, 0.84, 0.74);

float sCurve(float x, float amount) {
  // Pivoting at 0.45 rather than 0.5 keeps the shadows from closing up.
  float t = clamp(x, 0.0, 1.0);
  float s = t * t * (3.0 - 2.0 * t);
  float pivoted = mix(t, s, amount);
  return mix(t, pivoted, 1.0);
}

void main() {
  vec3 colour = max(texture(uImage, vUv).rgb, vec3(0.0));

  // Work on a perceptual encoding so the curves bend where the eye looks.
  vec3 c = pow(colour, vec3(1.0 / 2.2));

  // 1 — pull the saturation back towards the earths.
  float luma = dot(c, LUMA);
  c = mix(vec3(luma), c, clamp(uSaturation, 0.0, 1.5));

  // 2 — tint the lights and the shadows apart.
  float t = smoothstep(0.15, 0.85, luma);
  vec3 tint = mix(SHADOW_TINT, HIGHLIGHT_TINT, t);
  c *= mix(vec3(1.0), tint, clamp(uWarmth, 0.0, 1.0));

  // 3 — lift the blacks onto warm grey, and take the edge off pure white.
  float lift = 0.055 * uWarmth;
  vec3 floorColour = vec3(0.075, 0.062, 0.050);
  c = mix(c, floorColour + c * (1.0 - lift), uWarmth);
  c = min(c, vec3(1.0 - 0.025 * uWarmth));

  // 4 — the S-curve, slightly stronger on red than on blue so that deepening
  // the contrast also deepens the warmth, the way varnish does.
  float amount = clamp(uContrast, 0.0, 1.0);
  c = vec3(
    sCurve(c.r, amount * 1.00),
    sCurve(c.g, amount * 0.94),
    sCurve(c.b, amount * 0.86)
  );

  fragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
}`;
