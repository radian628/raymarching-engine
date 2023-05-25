import { addDefaultFunctionsToShaderCode } from "../settings/shader-editor/Validate";
import { halton } from "../util/Halton";
import { loadText } from "../util/Loader";
import { RenderJobSchema } from "./RenderJobSchema";
import { ProgramCache, ShaderError } from "./ShaderCache";
import { setUniforms, u } from "./Uniforms";

export type RenderJob = {
  done: boolean;
  next: () => void;
  time: number;
};

export type RenderJobFramebufferInfo = {
  prev: WebGLFramebuffer;
  curr: WebGLFramebuffer;
  width: number;
  height: number;
  prevTex: {
    color: WebGLTexture;
    normalAndDofRadius: WebGLTexture;
    albedoAndDepth: WebGLTexture;
  };
  currTex: {
    color: WebGLTexture;
    normalAndDofRadius: WebGLTexture;
    albedoAndDepth: WebGLTexture;
  };
  frameid: number;
};

export type RenderJobContext = {
  programCache: ProgramCache;
  gl: WebGL2RenderingContext;

  fbo: {
    create: (
      width: number,
      height: number,
      frameid: number
    ) => RenderJobFramebufferInfo | undefined;
    delete: (width: number, height: number, frameid: number) => void;
  };

  program: {
    display: WebGLProgram;
    blit: WebGLProgram;
    merge: WebGLProgram;
  };

  fullscreenQuadBuffer: WebGLBuffer;

  vao: WebGLVertexArrayObject;
};

export function failIfAnyKeysAreUndefined<T extends {}>(
  t: T,
  keys: (keyof T)[],
  callback?: (key: keyof T) => void
) {
  for (const key of keys) {
    if (t[key] === undefined) {
      if (callback) callback(key);
      return undefined;
    }
  }
  return t as { [K in keyof T]: Exclude<T[K], undefined> };
}

const renderJobHalton2 = halton(2);
const renderJobHalton3 = halton(3);

function genErr(infoLog: string): { type: "general"; infoLog: string } {
  return { type: "general", infoLog };
}

export async function doRenderJob(
  schema: RenderJobSchema,
  context: RenderJobContext
): Promise<
  (
    present: (
      gl: WebGL2RenderingContext,
      schema: RenderJobSchema,
      context: RenderJobContext,
      framebuffers: RenderJobFramebufferInfo,
      samplesSoFar: number
    ) => void
  ) => Generator<
    undefined,
    | {
        success: boolean;
        why: ShaderError | { type: "general"; infoLog: string };
      }
    | {
        success: boolean;
        why?: undefined;
      },
    unknown
  >
> {
  const gl = context.gl;
  gl.bindVertexArray(context.vao);

  // get framebuffers (possibly reusing them)
  const framebuffers = context.fbo.create(
    schema.render.width,
    schema.render.height,
    schema.render.frameid
  );

  if (!framebuffers) {
    return function* () {
      return {
        success: false,
        why: genErr("Failed to load framebuffers."),
      };
    };
  }

  const raymarcherProgram = context.programCache.getProgram(
    await loadText("./shader/raymarcher.vert"),
    (await loadText("./shader/raymarcher.frag")).replace(
      "//SCENESDFHERE",
      addDefaultFunctionsToShaderCode(schema.sdfShaderSource)
    )
  );

  if (!(raymarcherProgram instanceof WebGLProgram)) {
    return function* () {
      return {
        success: false,
        why: raymarcherProgram,
      };
    };
  }
  let samplesRenderedSoFar = 0;

  return function* (
    present: (
      gl: WebGL2RenderingContext,
      schema: RenderJobSchema,
      context: RenderJobContext,
      framebuffers: RenderJobFramebufferInfo,
      samplesSoFar: number
    ) => void
  ) {
    for (
      let yPartitions = 0;
      yPartitions < schema.render.subdivisions;
      yPartitions++
    ) {
      for (
        let xPartitions = 0;
        xPartitions < schema.render.subdivisions;
        xPartitions++
      ) {
        for (
          let sampleIndex = 0;
          sampleIndex < schema.render.samplesPerPixel;
          sampleIndex++
        ) {
          if (samplesRenderedSoFar % schema.render.sampleYieldInterval == 0) {
            present(gl, schema, context, framebuffers, samplesRenderedSoFar);
            yield;
          }
          let x1 = Math.floor(
            (schema.render.width / schema.render.subdivisions) * xPartitions
          );
          let y1 = Math.floor(
            (schema.render.height / schema.render.subdivisions) * yPartitions
          );
          let x2 = Math.ceil(
            (schema.render.width / schema.render.subdivisions) *
              (xPartitions + 1)
          );
          let y2 = Math.ceil(
            (schema.render.height / schema.render.subdivisions) *
              (yPartitions + 1)
          );
          gl.enable(gl.SCISSOR_TEST);
          gl.scissor(x1, y1, x2, y2);
          gl.useProgram(raymarcherProgram);

          gl.bindBuffer(gl.ARRAY_BUFFER, context.fullscreenQuadBuffer);

          const positionAttribIndex = gl.getAttribLocation(
            raymarcherProgram,
            "vertex_position"
          );

          gl.vertexAttribPointer(positionAttribIndex, 2, gl.FLOAT, false, 8, 0);
          gl.enableVertexAttribArray(positionAttribIndex);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, framebuffers.prevTex.color);
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(
            gl.TEXTURE_2D,
            framebuffers.prevTex.normalAndDofRadius
          );
          gl.activeTexture(gl.TEXTURE2);
          gl.bindTexture(gl.TEXTURE_2D, framebuffers.prevTex.albedoAndDepth);

          gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffers.curr);
          gl.drawBuffers([
            gl.COLOR_ATTACHMENT0,
            gl.COLOR_ATTACHMENT1,
            gl.COLOR_ATTACHMENT2,
          ]);

          setUniforms(gl, raymarcherProgram, {
            blendWithPreviousFactor: u.float(
              schema.render.blendWithPreviousFrameFactor
            ),
            previousColor: u.int(0),
            previousNormalAndDofRadius: u.int(1),
            previousAlbedoAndDepth: u.int(2),
            randNoise: u.vec2(
              renderJobHalton2.next().value,
              renderJobHalton3.next().value
            ),
            position: u.vec3(...schema.camera.position),

            dofAmount: u.float(schema.dof.amount),
            dofFocalPlaneDistance: u.float(schema.dof.distance),

            cameraMode: u.int(
              ["perspective", "orthographic", "panoramic"].indexOf(
                schema.camera.mode.type
              )
            ),
            fov: u.float(
              schema.camera.mode.type == "perspective"
                ? schema.camera.mode.fov
                : schema.camera.mode.type == "orthographic"
                ? schema.camera.mode.size
                : 1
            ),

            reflections: u.float(schema.reflectionIterationCounts.length),

            raymarchingSteps: u.float(schema.reflectionIterationCounts[0]),

            indirectLightingRaymarchingSteps: u.float(
              schema.reflectionIterationCounts[1] ??
                schema.reflectionIterationCounts[0]
            ),

            aspect: u.float(schema.render.width / schema.render.height),

            fogDensity: u.float(schema.fogDensity),

            exposure: u.float(
              schema.render.exposure / schema.render.samplesPerPixel
            ),

            blendMode: u.int(schema.render.blendMode == "additive" ? 1 : 0),
            renderMode: u.int(schema.render.renderMode == "preview" ? 1 : 0),

            lightCount: u.int(schema.lights.length),

            showDofFocalPlane: u.int(schema.dof.showFocusedArea ? 1 : 0),
          });

          setUniforms(gl, raymarcherProgram, schema.customShaderParameters);

          gl.uniform1fv(
            gl.getUniformLocation(
              raymarcherProgram,
              "raymarchingStepCountsArray"
            ),
            schema.reflectionIterationCounts
          );

          if (schema.lights.length > 0) {
            gl.uniform3fv(
              gl.getUniformLocation(raymarcherProgram, "lightPositions"),
              schema.lights
                .map((l) => (l.type == "point" ? l.position : l.direction))
                .flat()
            );
            gl.uniform3fv(
              gl.getUniformLocation(raymarcherProgram, "lightColors"),
              schema.lights.map((l) => l.color).flat()
            );
            gl.uniform1fv(
              gl.getUniformLocation(raymarcherProgram, "lightSizes"),
              schema.lights.map((l) => (l.type == "point" ? l.size : 0))
            );
          }

          gl.uniformMatrix4fv(
            gl.getUniformLocation(raymarcherProgram, "rotation"),
            false,
            schema.camera.rotation
          );

          gl.drawArrays(gl.TRIANGLES, 0, 6);

          gl.useProgram(context.program.blit);

          gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffers.prev);
          gl.drawBuffers([
            gl.COLOR_ATTACHMENT0,
            gl.COLOR_ATTACHMENT1,
            gl.COLOR_ATTACHMENT2,
          ]);
          for (let i = 0; i < 3; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(
              gl.TEXTURE_2D,
              [
                framebuffers.currTex.color,
                framebuffers.currTex.normalAndDofRadius,
                framebuffers.currTex.albedoAndDepth,
              ][i]
            );
          }
          setUniforms(gl, context.program.blit, {
            inputImage1: u.int(0),
            inputImage2: u.int(1),
            inputImage3: u.int(2),
          });

          gl.drawArrays(gl.TRIANGLES, 0, 6);

          samplesRenderedSoFar++;
        }
      }
    }

    context.fbo.delete(
      schema.render.width,
      schema.render.height,
      schema.render.frameid
    );
    present(gl, schema, context, framebuffers, samplesRenderedSoFar);
    return { success: true };
  };
}
