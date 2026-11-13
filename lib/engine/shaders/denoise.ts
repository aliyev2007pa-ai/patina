/**
 * Pass 1 — normalise and quieten.
 *
 * Two jobs, done together because both touch every pixel anyway:
 *
 * 1. sRGB to linear. Photographs are stored with a curve baked in so that
 *    8 bits cover the range the eye cares about. That curve makes arithmetic
 *    lie: averaging two sRGB values does not give the colour that averaging
 *    the actual light would. Every later step averages pixels, so the curve
 *    comes off here and goes back on at the very end (PROJECT.md 3.2, step 1).
 *
 * 2. A small bilateral blur. JPEG compression leaves faint blocky noise, and
 *    the brush-stroke step would happily turn that noise into brush strokes.
 *    A bilateral blur averages nearby pixels but only when their colours are
 *    already close, so it smooths flat areas and leaves real edges alone —
 *    which is exactly the distinction we need to keep (PROJECT.md 3.2, step 2).
 */
export const DENOISE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform vec2 uTexel;
uniform float uStrength;

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

void main() {
  vec3 centre = srgbToLinear(texture(uImage, vUv).rgb);

  if (uStrength <= 0.0) {
    fragColor = vec4(centre, 1.0);
    return;
  }

  // Colours further apart than this are treated as a real edge, not noise.
  float range = 0.055 / max(uStrength, 0.001);

  vec3 sum = vec3(0.0);
  float weightSum = 0.0;

  for (int j = -2; j <= 2; ++j) {
    for (int i = -2; i <= 2; ++i) {
      vec2 offset = vec2(float(i), float(j)) * uTexel;
      vec3 sample0 = srgbToLinear(texture(uImage, vUv + offset).rgb);

      float spatial = exp(-float(i * i + j * j) / 6.0);
      float difference = dot(sample0 - centre, sample0 - centre);
      float tonal = exp(-difference / (range * range));

      float weight = spatial * tonal;
      sum += sample0 * weight;
      weightSum += weight;
    }
  }

  fragColor = vec4(sum / max(weightSum, 1e-5), 1.0);
}`;
