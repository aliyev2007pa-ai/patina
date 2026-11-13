/**
 * Going back in with a smaller brush.
 *
 * A painter does not finish an area in one pass. The canvas is blocked in
 * with a broad brush first — big, confident, approximate — and then, only
 * where the big brush lost something worth keeping, a smaller one goes back
 * over it. The background stays loose. The eyes get worked.
 *
 * That is exactly what this pass does, and the clever part is that it does
 * not need to be told where the important bits are. Comparing the coarse
 * layer against the photograph shows where the broad brush threw detail
 * away; those are precisely the places a painter would return to. Flat walls
 * come back nearly unchanged and keep their loose strokes. Eyes, lettering
 * and edges come back changed, and get the fine layer.
 *
 * The alternative — one medium brush everywhere — is what makes most
 * painterly filters look mechanical. Uniform stroke size is the one thing no
 * hand-painted picture has.
 */
export const COMBINE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uCoarse;
uniform sampler2D uFine;
uniform sampler2D uPhoto;
uniform float uAmount;

void main() {
  vec3 coarse = texture(uCoarse, vUv).rgb;

  if (uAmount <= 0.0) {
    fragColor = vec4(coarse, 1.0);
    return;
  }

  vec3 fine = texture(uFine, vUv).rgb;
  vec3 photo = texture(uPhoto, vUv).rgb;

  // How much the broad brush gave up here.
  vec3 difference = coarse - photo;
  float lost = sqrt(dot(difference, difference) * 0.3333);

  // Below the first threshold the broad brush was faithful enough to leave
  // alone; above the second it clearly lost the form. Between them the two
  // layers cross over gradually, so no seam appears.
  float mask = smoothstep(0.015, 0.16, lost) * clamp(uAmount, 0.0, 1.0);

  fragColor = vec4(mix(coarse, fine, mask), 1.0);
}`;
