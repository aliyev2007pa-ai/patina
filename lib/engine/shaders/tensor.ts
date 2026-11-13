/**
 * Pass 2 — work out which way the image is "flowing" at every pixel.
 *
 * This is the structure tensor, and it is what separates a painting from a
 * poster filter. A plain Kuwahara filter averages square blocks, so its
 * strokes all sit at the same angle no matter what the picture does. A
 * painter's strokes follow the form: along a cheekbone, around an eye, down
 * the fold of a sleeve.
 *
 * The tensor is built from the image gradient. At each pixel, take the rate
 * of change left-to-right (Sx) and top-to-bottom (Sy), then store the three
 * products Sx·Sx, Sx·Sy and Sy·Sy. Those three numbers describe an ellipse:
 * its long axis points along the edge, its short axis across it, and how
 * stretched it is says how strongly the image is oriented there.
 *
 * Sobel is used for the gradient rather than a plain difference because it
 * averages across three rows, which makes it far less jumpy on noisy photos.
 */
export const TENSOR_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform vec2 uTexel;

void main() {
  vec2 d = uTexel;

  vec3 tl = texture(uImage, vUv + vec2(-d.x,  d.y)).rgb;
  vec3 tc = texture(uImage, vUv + vec2( 0.0,  d.y)).rgb;
  vec3 tr = texture(uImage, vUv + vec2( d.x,  d.y)).rgb;
  vec3 ml = texture(uImage, vUv + vec2(-d.x,  0.0)).rgb;
  vec3 mr = texture(uImage, vUv + vec2( d.x,  0.0)).rgb;
  vec3 bl = texture(uImage, vUv + vec2(-d.x, -d.y)).rgb;
  vec3 bc = texture(uImage, vUv + vec2( 0.0, -d.y)).rgb;
  vec3 br = texture(uImage, vUv + vec2( d.x, -d.y)).rgb;

  // Sobel, scaled by 1/4 so the result stays in a comfortable range.
  vec3 sx = (tr + 2.0 * mr + br - tl - 2.0 * ml - bl) * 0.25;
  vec3 sy = (tl + 2.0 * tc + tr - bl - 2.0 * bc - br) * 0.25;

  // The three distinct entries of the 2x2 tensor, summed over the channels.
  fragColor = vec4(dot(sx, sx), dot(sx, sy), dot(sy, sy), 1.0);
}`;

/**
 * Pass 3 — blur the tensor, separably (horizontally then vertically).
 *
 * Gradients measured pixel by pixel are noisy, and strokes that follow noisy
 * directions look frayed. Blurring the tensor first averages the *direction*
 * over a small neighbourhood, so the strokes come out of the next pass
 * coherent and flowing rather than scratchy.
 *
 * Averaging tensors is legitimate in a way that averaging angles is not: two
 * edges at 10° and 170° average to a horizontal direction, which is right,
 * whereas their angles average to 90°, which is nonsense.
 */
export const TENSOR_BLUR_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform vec2 uTexel;
uniform vec2 uDirection;

void main() {
  // Nine-tap Gaussian, sigma about 2 pixels.
  const float w0 = 0.2270270270;
  const float w1 = 0.1945945946;
  const float w2 = 0.1216216216;
  const float w3 = 0.0540540541;
  const float w4 = 0.0162162162;

  vec2 step1 = uDirection * uTexel;

  vec4 sum = texture(uImage, vUv) * w0;
  sum += (texture(uImage, vUv + step1) + texture(uImage, vUv - step1)) * w1;
  sum += (texture(uImage, vUv + step1 * 2.0) + texture(uImage, vUv - step1 * 2.0)) * w2;
  sum += (texture(uImage, vUv + step1 * 3.0) + texture(uImage, vUv - step1 * 3.0)) * w3;
  sum += (texture(uImage, vUv + step1 * 4.0) + texture(uImage, vUv - step1 * 4.0)) * w4;

  fragColor = sum;
}`;
