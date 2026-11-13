/**
 * Final pass — mix with the photograph, then back to sRGB for the screen.
 *
 * The Intensity control lives here rather than inside each step, because
 * dialling down every stage separately produces a muddle: half-strength
 * brush strokes with half-strength varnish look like a mistake, where a
 * half-strength painting over the photograph looks like a deliberate blend.
 * The mix happens in linear light, where a 50% blend is actually 50% of the
 * light, which is what the eye expects of a dissolve.
 *
 * The sRGB curve goes back on last. Everything upstream worked in linear
 * light so that averaging pixels meant averaging light. Skipping this step
 * leaves the picture washed out and milky — the usual sign of a pipeline
 * that forgot to come home (PROJECT.md 3.2, step 9).
 */
export const OUTPUT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform sampler2D uOriginal;
uniform float uIntensity;

vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec3 painted = texture(uImage, vUv).rgb;
  vec3 original = texture(uOriginal, vUv).rgb;
  vec3 mixed = mix(original, painted, clamp(uIntensity, 0.0, 1.0));
  fragColor = vec4(linearToSrgb(mixed), 1.0);
}`;
