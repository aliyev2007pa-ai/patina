/**
 * Pass 4 — the brush strokes. This is the step that decides whether the
 * result looks painted or merely filtered (PROJECT.md 3.2, step 3).
 *
 * The idea behind any Kuwahara filter: look at the neighbourhood around a
 * pixel, split it into sectors, and take the colour of whichever sector is
 * most uniform. Flat areas get flattened further; edges stay sharp, because
 * the sector that does not straddle the edge always wins. The output looks
 * like it was laid down in deliberate strokes rather than blurred.
 *
 * The *anisotropic* part is what makes it look hand-painted rather than
 * plastic. Instead of a circular neighbourhood, this reads an ellipse: long
 * in the direction the image is flowing (from the structure tensor of the
 * previous pass), narrow across it. The resulting strokes lie along contours.
 * PROJECT.md is explicit that the simple square-block version is not good
 * enough, and it is right — that one gives you a poster filter.
 *
 * Two refinements over the textbook version:
 *
 * - Sectors are weighted, not chosen. Picking a single winner makes
 *   neighbouring pixels flip between sectors and the result crawls with
 *   blotches. Every sector contributes, weighted by 1/(1 + variance^q), so
 *   uniform sectors dominate smoothly. `q` is the Sharpness control: low
 *   values give soft Renaissance blending, high values a hard Baroque edge.
 *
 * - Each sample is weighted by a Gaussian on its distance, so the ellipse
 *   fades out at its rim instead of ending abruptly.
 */
export const KUWAHARA_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform sampler2D uTensor;
uniform vec2 uTexel;
uniform float uRadius;     // brush size, in pixels
uniform float uSharpness;  // q — how decisively the calmest sector wins
uniform float uEccentricity; // how much the ellipse stretches along the flow

const int SECTORS = 8;
const float PI = 3.14159265359;

void main() {
  vec3 tensor = texture(uTensor, vUv).rgb;
  float e = tensor.x;
  float f = tensor.y;
  float g = tensor.z;

  // Eigenvalues of [[e, f], [f, g]] — the two rates of change, largest first.
  float difference = e - g;
  float root = sqrt(difference * difference + 4.0 * f * f);
  float lambda1 = 0.5 * (e + g + root);
  float lambda2 = 0.5 * (e + g - root);

  // Direction of steepest change, written in double-angle form.
  //
  // The textbook eigenvector, (lambda1 - g, f), collapses to (0, 0) for a
  // perfectly horizontal edge — where f is zero and lambda1 equals g — and
  // the direction is lost exactly where it matters. Any fallback guess there
  // is wrong half the time, and a wrong direction stretches the brush ACROSS
  // the edge instead of along it, which smears the picture rather than
  // painting it. This form has no such hole.
  float theta = 0.5 * atan(2.0 * f, e - g);
  vec2 across = vec2(cos(theta), sin(theta));
  vec2 along = vec2(-across.y, across.x);

  // 0 where the image is featureless, approaching 1 on a strong edge.
  float sum = lambda1 + lambda2;
  float anisotropy = sum > 1e-10 ? (lambda1 - lambda2) / sum : 0.0;

  // Stretch along the flow, squeeze across it, keeping the area similar.
  float stretch = 1.0 + uEccentricity * anisotropy;
  float major = max(uRadius * stretch, 1.0);
  float minor = max(uRadius / stretch, 1.0);

  // Bounding box of the rotated ellipse, so the loop reads no more than it must.
  vec2 extent = vec2(
    sqrt(major * major * along.x * along.x + minor * minor * across.x * across.x),
    sqrt(major * major * along.y * along.y + minor * minor * across.y * across.y)
  );
  int spanX = int(min(ceil(extent.x), 24.0));
  int spanY = int(min(ceil(extent.y), 24.0));

  vec3 mean[SECTORS];
  vec3 meanSquare[SECTORS];
  float weightSum[SECTORS];

  for (int k = 0; k < SECTORS; ++k) {
    mean[k] = vec3(0.0);
    meanSquare[k] = vec3(0.0);
    weightSum[k] = 0.0;
  }

  for (int j = -spanY; j <= spanY; ++j) {
    for (int i = -spanX; i <= spanX; ++i) {
      vec2 offset = vec2(float(i), float(j));

      // Into the ellipse's own frame, where it is a unit circle.
      vec2 local = vec2(dot(offset, along) / major, dot(offset, across) / minor);
      float radiusSquared = dot(local, local);
      if (radiusSquared > 1.0) continue;

      // Which of the eight wedges this sample falls in.
      float angle = atan(local.y, local.x) + PI;
      int sector = int(floor(angle / (2.0 * PI / float(SECTORS))));
      sector = clamp(sector, 0, SECTORS - 1);

      float weight = exp(-3.0 * radiusSquared);
      vec3 colour = texture(uImage, vUv + offset * uTexel).rgb;

      mean[sector] += colour * weight;
      meanSquare[sector] += colour * colour * weight;
      weightSum[sector] += weight;
    }
  }

  vec3 result = vec3(0.0);
  float resultWeight = 0.0;

  for (int k = 0; k < SECTORS; ++k) {
    if (weightSum[k] <= 1e-6) continue;

    vec3 average = mean[k] / weightSum[k];
    vec3 variance = max(meanSquare[k] / weightSum[k] - average * average, vec3(0.0));
    float spread = dot(variance, vec3(0.3333333));

    // The calmer the sector, the more of the final colour it contributes.
    float weight = 1.0 / (1.0 + pow(max(spread, 0.0) * 64.0, 0.5 * uSharpness));

    result += average * weight;
    resultWeight += weight;
  }

  fragColor = vec4(result / max(resultWeight, 1e-6), 1.0);
}`;
