import { loadText } from "../util/Loader";
import { createGenericMap } from "../util/Memoize";
import {
  failIfAnyKeysAreUndefined,
  RenderJobContext,
  RenderJobFramebufferInfo,
} from "./RenderJobExecutor";
import { createProgramCache, ProgramCache, ShaderError } from "./ShaderCache";

function shaderErr2Undefined(
  t: WebGLProgram | ShaderError
): WebGLProgram | undefined {
  if (t instanceof WebGLProgram) return t;
}

export async function loadRenderJobShaderPrograms(programCache: ProgramCache) {
  return failIfAnyKeysAreUndefined(
    {
      merge: shaderErr2Undefined(
        programCache.getProgram(
          await loadText("./shader/merge.vert"),
          await loadText("./shader/merge.frag")
        )
      ),
      display: shaderErr2Undefined(
        programCache.getProgram(
          await loadText("./shader/display.vert"),
          await loadText("./shader/display.frag")
        )
      ),
      blit: shaderErr2Undefined(
        programCache.getProgram(
          await loadText("./shader/blit.vert"),
          await loadText("./shader/blit.frag")
        )
      ),
    },
    ["merge", "display", "blit"],
    (key) => console.log(key)
  );
}

export function setupTextureFilters(gl: WebGL2RenderingContext) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

export function loadRenderJobFramebufferTextures(
  gl: WebGL2RenderingContext,
  width: number,
  height: number
) {
  const color = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, color);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA32F,
    width,
    height,
    0,
    gl.RGBA,
    gl.FLOAT,
    null
  );
  setupTextureFilters(gl);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    color,
    0
  );

  const normalAndDofRadius = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, normalAndDofRadius);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA16F,
    width,
    height,
    0,
    gl.RGBA,
    gl.HALF_FLOAT,
    null
  );
  setupTextureFilters(gl);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT1,
    gl.TEXTURE_2D,
    normalAndDofRadius,
    0
  );

  const albedoAndDepth = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, albedoAndDepth);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA16F,
    width,
    height,
    0,
    gl.RGBA,
    gl.HALF_FLOAT,
    null
  );
  setupTextureFilters(gl);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT2,
    gl.TEXTURE_2D,
    albedoAndDepth,
    0
  );

  if (!color || !normalAndDofRadius || !albedoAndDepth) return undefined;

  return { color, normalAndDofRadius, albedoAndDepth };
}

export function loadRenderJobFramebuffers(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  frameid: number
): RenderJobFramebufferInfo | undefined {
  // create previous framebuffer
  const prev = gl.createFramebuffer();
  if (!prev) return undefined;
  gl.bindFramebuffer(gl.FRAMEBUFFER, prev);
  const prevTex = loadRenderJobFramebufferTextures(gl, width, height);

  // create current framebuffer
  const curr = gl.createFramebuffer();
  if (!curr) return undefined;
  gl.bindFramebuffer(gl.FRAMEBUFFER, curr);
  const currTex = loadRenderJobFramebufferTextures(gl, width, height);
  console.log(
    gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
  );

  // regenerate framebuffers
  return failIfAnyKeysAreUndefined(
    {
      prev,
      curr,
      prevTex,
      currTex,
      width,
      height,
      frameid,
    },
    ["prevTex", "currTex"]
  );
}

export function loadRenderJobFramebufferGetter(gl: WebGL2RenderingContext) {
  const map = createGenericMap<
    {
      width: number;
      height: number;
      frameid: number;
    },
    RenderJobFramebufferInfo
  >(
    (key) => key.width + 10000 * key.height + 100000000 * key.frameid,
    (a, b) =>
      a.width == b.width && a.height == b.height && a.frameid == b.frameid
  );

  const framebufferPurgatory: RenderJobFramebufferInfo[] = [];

  function retrieveRenderJobFramebuffer(
    width: number,
    height: number,
    frameid: number
  ) {}

  return {
    // creates or loads in a set of framebuffers for rendering the next frame
    create: (width: number, height: number, frameid: number) => {
      // attempt to reuse framebuffer from cache of existing framebuffers
      const framebufferInfo = map.get({ width, height, frameid });
      if (framebufferInfo) {
        return framebufferInfo;
      } else {
        // attempt to reuse framebuffers from cache of unused "purgatory framebuffers"
        const purgatoryLookupIndex = framebufferPurgatory.findIndex((info) => {
          return width == info.width && height == info.height;
        });
        if (purgatoryLookupIndex != -1) {
          let newFramebufferInfo = framebufferPurgatory.splice(
            purgatoryLookupIndex,
            1
          )[0];
          map.set({ width, height, frameid }, newFramebufferInfo);
          if (newFramebufferInfo.frameid != frameid) {
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, newFramebufferInfo.prev);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            newFramebufferInfo.frameid = frameid;
          }
          return newFramebufferInfo;

          // create an entirely new set of framebuffers
        } else {
          let newFramebufferInfo = loadRenderJobFramebuffers(
            gl,
            width,
            height,
            frameid
          );

          if (!newFramebufferInfo) return undefined;
          map.set({ width, height, frameid }, newFramebufferInfo);
          return newFramebufferInfo;
        }
      }
    },

    // deletes framebuffers, potentially caching them for reuse
    delete: (width: number, height: number, frameid: number) => {
      const key = { width, height, frameid };
      const fb = map.get(key);

      if (fb) {
        // move framebuffer to framebuffer purgatory
        framebufferPurgatory.push(fb);

        // clear out framebuffer purgatory if there's too many
        if (framebufferPurgatory.length > 3) {
          const oldfb = framebufferPurgatory.shift();
          if (oldfb) {
            gl.deleteFramebuffer(oldfb.curr);
            gl.deleteFramebuffer(oldfb.prev);
            gl.deleteTexture(oldfb.currTex.color);
            gl.deleteTexture(oldfb.prevTex.color);
          }
        }
      }

      map.delete(key);
    },
  };
}

export type RenderJobParameters = {
  width: number;
  height: number;
};

export function loadFullscreenQuadBuffer(gl: WebGL2RenderingContext) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  return buffer ?? undefined;
}

export async function loadRenderJobContext(
  gl: WebGL2RenderingContext
): Promise<RenderJobContext | undefined> {
  const programCache = createProgramCache(gl);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  return failIfAnyKeysAreUndefined(
    {
      gl,
      programCache,
      program: await loadRenderJobShaderPrograms(programCache),
      fbo: loadRenderJobFramebufferGetter(gl),
      fullscreenQuadBuffer: loadFullscreenQuadBuffer(gl),
      vao: vao ?? undefined,
    },
    ["program", "fbo", "vao"],
    (key) => console.log(key)
  );
}
