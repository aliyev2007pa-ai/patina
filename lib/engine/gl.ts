/**
 * The small amount of WebGL plumbing the paint engine needs.
 *
 * Every step of the pipeline is the same shape: draw one triangle that covers
 * the screen, run a fragment shader over every pixel, write the result into a
 * texture. So rather than a general renderer, this file provides exactly that
 * — a pass — and nothing else.
 *
 * There is no vertex buffer anywhere. The vertex shader derives its three
 * corners from `gl_VertexID`, which saves setting up and binding geometry that
 * would never change.
 */

export class GLError extends Error {}

/** A texture that can also be drawn into. Passes ping-pong between these. */
export type RenderTarget = {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
};

export const VERTEX_SHADER = `#version 300 es
out vec2 vUv;
void main() {
  // 0 -> (0,0), 1 -> (2,0), 2 -> (0,2): one oversized triangle covering
  // the whole viewport, cheaper than two triangles meeting at a diagonal.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export function createContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true, // so the canvas can be read back for download
  });

  if (!gl) throw new GLError("This browser does not support WebGL2.");

  // Intermediate results are kept as 16-bit floats. Eight bits per channel is
  // not enough: the structure tensor holds squared gradients, which are tiny,
  // and banding in the tensor becomes visible as blocky brush strokes.
  if (!gl.getExtension("EXT_color_buffer_float")) {
    throw new GLError(
      "This browser's WebGL2 cannot render to floating point textures."
    );
  }

  return gl;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new GLError("Could not create a shader.");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown error";
    gl.deleteShader(shader);
    throw new GLError(`Shader failed to compile: ${log}`);
  }

  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  fragmentSource: string
): WebGLProgram {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  if (!program) throw new GLError("Could not create a program.");

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  // The shaders are owned by the program now; flagging them for deletion here
  // means they go away with it.
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown error";
    gl.deleteProgram(program);
    throw new GLError(`Shader program failed to link: ${log}`);
  }

  return program;
}

export function createRenderTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number
): RenderTarget {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) throw new GLError("Could not allocate a render target.");

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new GLError(`Render target is not usable (status ${status}).`);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { texture, framebuffer, width, height };
}

/** Uploads the decoded photograph as the pipeline's starting texture. */
export function createSourceTexture(
  gl: WebGL2RenderingContext,
  source: TexImageSource
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new GLError("Could not allocate the source texture.");

  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Canvas rows run top to bottom; OpenGL expects bottom to top.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return texture;
}

export type Uniforms = Record<string, number | [number, number] | WebGLTexture>;

/**
 * Runs one shader over every pixel of `target`, or of the canvas when target
 * is null. Textures passed in `uniforms` are bound to successive texture
 * units automatically, so callers never deal with unit numbers.
 */
export function runPass(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniforms: Uniforms,
  target: RenderTarget | null
) {
  gl.useProgram(program);

  if (target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  let unit = 0;
  for (const [name, value] of Object.entries(uniforms)) {
    const location = gl.getUniformLocation(program, name);
    if (location === null) continue; // optimised away by the compiler

    if (typeof value === "number") {
      gl.uniform1f(location, value);
    } else if (Array.isArray(value)) {
      gl.uniform2f(location, value[0], value[1]);
    } else {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, value);
      gl.uniform1i(location, unit);
      unit += 1;
    }
  }

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
