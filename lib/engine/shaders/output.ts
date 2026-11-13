/**
 * Final pass — back to sRGB for the screen.
 *
 * Everything upstream worked in linear light, where arithmetic behaves. The
 * display expects the sRGB curve, so it goes back on here. Skipping this step
 * makes the picture look washed out and milky, which is a common giveaway of
 * a pipeline that never left linear space (PROJECT.md 3.2, step 9).
 */
export const OUTPUT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;

vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  fragColor = vec4(linearToSrgb(texture(uImage, vUv).rgb), 1.0);
}`;
