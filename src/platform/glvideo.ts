/**
 * WebGL 2 presenter with lighting effects (not in the remake).
 *
 * The game's frame (RGBA, any scale) is uploaded as a texture together with
 * the collision buffer, and shaders add, only on screen:
 *   - lighting: the game area gets darker, with round lights from the
 *     characters, fire, explosions, fairies and lava (see game/lights.ts);
 *   - shadows: walls, characters and enemies cast a soft shadow on the
 *     background (the collision buffer says which pixels are which);
 *   - halos: a soft glow behind the enemies (stronger behind bats) and the items;
 *   - bloom: bright pixels (fire, lava, coins, the sword) glow;
 *   - a light vignette over the game area.
 * The game itself does not see any of this: logic, collisions and the frame
 * buffer stay exactly the same.
 */
import type { Screen } from '../engine/screen';
import { GAME_VIEW_X, GAME_VIEW_Y, SCREEN_X, SCREEN_Y } from '../game/constants';
import { MAX_HALOS, MAX_LIGHTS, type SceneLighting } from '../game/lights';
import type { ViewRects } from './video';

const QUAD_VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/** Lighting and shadows, at full resolution. uv (0,0) is the top-left of the picture. */
const LIGHT_FS = `#version 300 es
precision highp float;
precision highp usampler2D;
uniform sampler2D uFrame;
uniform usampler2D uColl;
uniform vec4 uGame;      // game area in game pixels: x0, y0, x1, y1
uniform float uActive;
uniform float uAmbient;
uniform int uCount;
uniform vec4 uLight[${MAX_LIGHTS}];  // x, y, radius, intensity
uniform vec3 uColor[${MAX_LIGHTS}];
uniform int uHaloCount;
uniform vec4 uHalo[${MAX_HALOS}];    // x, y, radius, strength
uniform vec3 uHaloColor[${MAX_HALOS}];
in vec2 vUv;
out vec4 outColor;

const uint CASTERS = 1u | 4u | 8u | 16u | 64u;  // walls, ladder walls, door walls, player, enemies
const uint LAVA = 128u;
const uint ENEMY = 64u;

uint coll(ivec2 p) {
  return texelFetch(uColl, clamp(p, ivec2(0), ivec2(${SCREEN_X - 1}, ${SCREEN_Y - 1})), 0).r;
}

void main() {
  vec3 c = texture(uFrame, vUv).rgb;
  vec2 p = vUv * vec2(${SCREEN_X}.0, ${SCREEN_Y}.0);
  if (uActive < 0.5 || p.x < uGame.x || p.y < uGame.y || p.x >= uGame.z || p.y >= uGame.w) {
    outColor = vec4(c, 1.0);
    return;
  }
  ivec2 ip = ivec2(p);
  uint here = coll(ip);

  // Soft shadow: how much of a small area up-left of this pixel is covered by casters.
  float shadow = 1.0;
  if ((here & CASTERS) == 0u) {
    float cover = 0.0;
    for (int dy = -1; dy <= 1; dy++)
      for (int dx = -1; dx <= 1; dx++)
        cover += (coll(ip - ivec2(4 + dx * 2, 5 + dy * 2)) & CASTERS) != 0u ? 1.0 : 0.0;
    shadow = 1.0 - 0.45 * cover / 9.0;
  }

  vec3 light = vec3(uAmbient);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uCount) break;
    float f = clamp(1.0 - distance(p, uLight[i].xy) / uLight[i].z, 0.0, 1.0);
    light += uColor[i] * uLight[i].w * f * f;
  }
  vec3 lit = c * min(light, vec3(1.35)) * shadow;
  // Lava and very bright pixels give their own light.
  float self = (here & LAVA) != 0u ? 1.0 : smoothstep(0.8, 1.0, max(c.r, max(c.g, c.b))) * 0.35;
  vec3 result = mix(lit, max(lit, c), self);
  // Halos: added light around dark figures, but not on the figure itself, so its outline stands out.
  if ((here & ENEMY) == 0u) {
    for (int i = 0; i < ${MAX_HALOS}; i++) {
      if (i >= uHaloCount) break;
      float f = clamp(1.0 - distance(p, uHalo[i].xy) / uHalo[i].z, 0.0, 1.0);
      result += uHaloColor[i] * uHalo[i].w * f * sqrt(f);
    }
  }
  outColor = vec4(result, 1.0);
}`;

/** Bright parts, for the bloom (rendered at a quarter of the size). */
const BRIGHT_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 c = texture(uSrc, vUv).rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  outColor = vec4(c * smoothstep(0.55, 0.9, lum), 1.0);
}`;

/** One direction of a Gaussian blur. */
const BLUR_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uStep;
in vec2 vUv;
out vec4 outColor;
void main() {
  const float w[5] = float[](0.227, 0.194, 0.121, 0.054, 0.016);
  vec3 s = texture(uSrc, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    s += texture(uSrc, vUv + uStep * float(i)).rgb * w[i];
    s += texture(uSrc, vUv - uStep * float(i)).rgb * w[i];
  }
  outColor = vec4(s, 1.0);
}`;

/** Final picture of one view: source rectangle (uv) → destination rectangle (canvas pixels). */
const VIEW_VS = `#version 300 es
in vec2 aPos;
uniform vec4 uSrc;     // uv rectangle: x, y, w, h (y down)
uniform vec4 uDst;     // canvas pixels: x, y, w, h (y down)
uniform vec2 uCanvas;
out vec2 vUv;
void main() {
  vec2 t = aPos * 0.5 + 0.5;            // 0..1, y up
  vec2 down = vec2(t.x, 1.0 - t.y);     // 0..1, y down
  vUv = uSrc.xy + down * uSrc.zw;
  vec2 px = uDst.xy + down * uDst.zw;
  gl_Position = vec4(px.x / uCanvas.x * 2.0 - 1.0, 1.0 - px.y / uCanvas.y * 2.0, 0.0, 1.0);
}`;

const COMPOSE_FS = `#version 300 es
precision highp float;
uniform sampler2D uLit;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uVignette;
uniform vec4 uGame;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 c = texture(uLit, vUv).rgb + texture(uBloom, vUv).rgb * uBloomStrength;
  vec2 p = vUv * vec2(${SCREEN_X}.0, ${SCREEN_Y}.0);
  if (uVignette > 0.0 && p.x >= uGame.x && p.y >= uGame.y && p.x < uGame.z && p.y < uGame.w) {
    vec2 q = (p - (uGame.xy + uGame.zw) * 0.5) / ((uGame.zw - uGame.xy) * 0.5);
    c *= 1.0 - uVignette * smoothstep(0.6, 1.4, length(q));
  }
  outColor = vec4(c, 1.0);
}`;

interface Program {
  prog: WebGLProgram;
  u: (name: string) => WebGLUniformLocation | null;
}

interface Target {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  w: number;
  h: number;
}

export class GLVideo {
  private readonly gl: WebGL2RenderingContext;
  private readonly frameTex: WebGLTexture;
  private readonly collTex: WebGLTexture;
  private readonly lit: Target;
  private readonly bloomA: Target;
  private readonly bloomB: Target;
  private readonly lightProg: Program;
  private readonly brightProg: Program;
  private readonly blurProg: Program;
  private readonly composeProg: Program;
  private readonly lightData = new Float32Array(MAX_LIGHTS * 4);
  private readonly colorData = new Float32Array(MAX_LIGHTS * 3);
  private readonly haloData = new Float32Array(MAX_HALOS * 4);
  private readonly haloColorData = new Float32Array(MAX_HALOS * 3);
  private readonly width: number;
  private readonly height: number;

  /** null when WebGL 2 is not available (use the canvas-2D Video then). */
  static create(canvas: HTMLCanvasElement, scale: number): GLVideo | null {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    return gl === null ? null : new GLVideo(canvas, gl, scale);
  }

  private constructor(
    readonly canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    readonly scale: number,
  ) {
    this.gl = gl;
    this.width = SCREEN_X * scale;
    this.height = SCREEN_Y * scale;
    canvas.width = this.width;
    canvas.height = this.height;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.lightProg = this.program(QUAD_VS, LIGHT_FS);
    this.brightProg = this.program(QUAD_VS, BRIGHT_FS);
    this.blurProg = this.program(QUAD_VS, BLUR_FS);
    this.composeProg = this.program(VIEW_VS, COMPOSE_FS);

    this.frameTex = this.texture(gl.RGBA8, this.width, this.height, gl.NEAREST);
    this.collTex = this.texture(gl.R8UI, SCREEN_X, SCREEN_Y, gl.NEAREST);
    this.lit = this.target(this.width, this.height, gl.NEAREST);
    this.bloomA = this.target(this.width >> 2, this.height >> 2, gl.LINEAR);
    this.bloomB = this.target(this.width >> 2, this.height >> 2, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  }

  private program(vs: string, fs: string): Program {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'program');
    const cache = new Map<string, WebGLUniformLocation | null>();
    return {
      prog,
      u: (name) => {
        if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name));
        return cache.get(name)!;
      },
    };
  }

  private texture(format: number, w: number, h: number, filter: number): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, format, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private target(w: number, h: number, filter: number): Target {
    const gl = this.gl;
    const tex = this.texture(gl.RGBA8, w, h, filter);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, w, h };
  }

  /** Run a full-screen pass of `p` into `to` (null: the canvas). */
  private pass(p: Program, to: Target | null, inputs: WebGLTexture[], setup: () => void): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, to === null ? null : to.fbo);
    gl.viewport(0, 0, to === null ? this.width : to.w, to === null ? this.height : to.h);
    gl.useProgram(p.prog);
    inputs.forEach((t, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
    });
    setup();
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Show the frame. With `scene` null the effects are off and the frame is shown as it is. */
  present(screen: Screen, collision: Uint8Array | null, views: ViewRects, scene: SceneLighting | null): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.frameTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      this.width,
      this.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array(screen.pixels.buffer, screen.pixels.byteOffset, screen.pixels.byteLength),
    );
    const active = scene !== null && scene.active && collision !== null;
    if (collision !== null) {
      gl.bindTexture(gl.TEXTURE_2D, this.collTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SCREEN_X, SCREEN_Y, gl.RED_INTEGER, gl.UNSIGNED_BYTE, collision);
    }
    const game = [GAME_VIEW_X, GAME_VIEW_Y, GAME_VIEW_X + 32 * 16, GAME_VIEW_Y + 20 * 16] as const;

    // 1. Lighting and shadows.
    const lights = scene?.lights ?? [];
    const n = Math.min(lights.length, MAX_LIGHTS);
    for (let i = 0; i < n; i++) {
      const l = lights[i];
      this.lightData.set([l.x, l.y, l.radius, l.intensity], i * 4);
      this.colorData.set([l.r, l.g, l.b], i * 3);
    }
    const halos = scene?.halos ?? [];
    const h = Math.min(halos.length, MAX_HALOS);
    for (let i = 0; i < h; i++) {
      const l = halos[i];
      this.haloData.set([l.x, l.y, l.radius, l.intensity], i * 4);
      this.haloColorData.set([l.r, l.g, l.b], i * 3);
    }
    this.pass(this.lightProg, this.lit, [this.frameTex, this.collTex], () => {
      const u = this.lightProg.u;
      gl.uniform1i(u('uFrame'), 0);
      gl.uniform1i(u('uColl'), 1);
      gl.uniform4f(u('uGame'), ...game);
      gl.uniform1f(u('uActive'), active ? 1 : 0);
      gl.uniform1f(u('uAmbient'), scene?.ambient ?? 1);
      gl.uniform1i(u('uCount'), n);
      gl.uniform4fv(u('uLight'), this.lightData);
      gl.uniform3fv(u('uColor'), this.colorData);
      gl.uniform1i(u('uHaloCount'), h);
      gl.uniform4fv(u('uHalo'), this.haloData);
      gl.uniform3fv(u('uHaloColor'), this.haloColorData);
    });

    // 2. Bloom: bright parts at a quarter of the size, blurred horizontally and vertically (twice).
    const bloom = scene !== null;
    if (bloom) {
      this.pass(this.brightProg, this.bloomA, [this.lit.tex], () => gl.uniform1i(this.brightProg.u('uSrc'), 0));
      for (let k = 0; k < 2; k++) {
        this.pass(this.blurProg, this.bloomB, [this.bloomA.tex], () => {
          gl.uniform1i(this.blurProg.u('uSrc'), 0);
          gl.uniform2f(this.blurProg.u('uStep'), 1 / this.bloomA.w, 0);
        });
        this.pass(this.blurProg, this.bloomA, [this.bloomB.tex], () => {
          gl.uniform1i(this.blurProg.u('uSrc'), 0);
          gl.uniform2f(this.blurProg.u('uStep'), 0, 1 / this.bloomA.h);
        });
      }
    }

    // 3. The views on the canvas.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const p = this.composeProg;
    gl.useProgram(p.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.lit.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex);
    gl.uniform1i(p.u('uLit'), 0);
    gl.uniform1i(p.u('uBloom'), 1);
    gl.uniform1f(p.u('uBloomStrength'), bloom ? 0.65 : 0);
    gl.uniform1f(p.u('uVignette'), active ? 0.15 : 0);
    gl.uniform4f(p.u('uGame'), ...game);
    gl.uniform2f(p.u('uCanvas'), this.width, this.height);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const k = this.scale;
    for (let v = 0; v < 4; v++) {
      if (views.logicDx[v] === 0) continue;
      gl.uniform4f(
        p.u('uSrc'),
        views.logicX[v] / SCREEN_X,
        views.logicY[v] / SCREEN_Y,
        views.logicDx[v] / SCREEN_X,
        views.logicDy[v] / SCREEN_Y,
      );
      gl.uniform4f(
        p.u('uDst'),
        views.physicX[v] * k,
        views.physicY[v] * k,
        views.physicDx[v] * k,
        views.physicDy[v] * k,
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  /** Scale the canvas (CSS) to the largest size that fits the window, keeping square pixels. */
  fitToWindow(): void {
    const s = Math.min(window.innerWidth / SCREEN_X, window.innerHeight / SCREEN_Y);
    this.canvas.style.width = `${Math.floor(SCREEN_X * s)}px`;
    this.canvas.style.height = `${Math.floor(SCREEN_Y * s)}px`;
  }
}
