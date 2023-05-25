import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { render } from "solid-js/web";
import { loadRenderJobContext } from "./renderer/LoadRenderJobContext";
import {
  doRenderJob,
  RenderJob,
  RenderJobContext,
  RenderJobFramebufferInfo,
} from "./renderer/RenderJobExecutor";
import { RenderJobSchema } from "./renderer/RenderJobSchema";
import { mat3, mat4, vec3 } from "gl-matrix";

import "./index.css";
import { setUniforms, u } from "./renderer/Uniforms";
import { Settings, SettingsData } from "./settings/Settings";

import { parser, generate } from "@shaderfrog/glsl-parser";

function makePresenter(samplesUpToThisPoint: number) {
  return function present(
    gl: WebGL2RenderingContext,
    schema: RenderJobSchema,
    context: RenderJobContext,
    framebuffers: RenderJobFramebufferInfo,
    samplesSoFar: number
  ) {
    gl.scissor(0, 0, schema.render.width, schema.render.height);
    gl.useProgram(context.program.display);
    setUniforms(gl, context.program.display, {
      color: u.int(0),
      normalAndDofRadiusTex: u.int(1),
      albedoAndDepthTex: u.int(2),
      brightness: u.float(1 / samplesUpToThisPoint),
    });
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(
      gl.TEXTURE_2D,
      (framebuffers as RenderJobFramebufferInfo).currTex.color
    );
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(
      gl.TEXTURE_2D,
      (framebuffers as RenderJobFramebufferInfo).currTex.normalAndDofRadius
    );
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(
      gl.TEXTURE_2D,
      (framebuffers as RenderJobFramebufferInfo).currTex.albedoAndDepth
    );
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
}

const realtimeMode = async (
  el: HTMLCanvasElement,
  settings: () => SettingsData,
  setSettings: (s: SettingsData) => void
) => {
  el.addEventListener("click", (e) => {
    if (e.button == 0) {
      el.requestPointerLock();
    }
  });

  let mouseHasMoved = 0;

  let cameraRotation = mat4.identity(mat4.create());
  let cameraPosition: [number, number, number] = [-0.5, 0.5, -4];
  let frameid = 0;

  el.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === el) {
      mat4.rotate(
        cameraRotation,
        cameraRotation,
        0.004 * e.movementX,
        [0.0, 1.0, 0.0]
      );
      mat4.rotate(
        cameraRotation,
        cameraRotation,
        0.004 * e.movementY,
        [1.0, 0.0, 0.0]
      );
      mouseHasMoved = 5;
    }
  });

  let keysBeingPressed = new Map<string, boolean>();
  document.addEventListener("keydown", (e) => {
    if (document.pointerLockElement === el)
      keysBeingPressed.set(e.key.toLowerCase(), true);
  });

  document.addEventListener("keyup", (e) => {
    keysBeingPressed.set(e.key.toLowerCase(), false);
  });

  const gl = el.getContext("webgl2", { preserveDrawingBuffer: true });
  if (!gl) return;
  gl.getExtension("EXT_color_buffer_float");

  const renderJobContext = await loadRenderJobContext(gl);

  console.log(renderJobContext);

  if (!renderJobContext) return;

  let previouslySwitchedToNewFrame = false;

  let samplesRenderedSoFar = 0;

  async function loop() {
    const testRenderJob: RenderJobSchema = {
      reflectionIterationCounts: settings().reflectionIterationCounts.map(
        (e) => e.count
      ),
      normalDelta: 0.00001,
      sdfShaderSource: settings().shaderCode,
      customShaderParameters: settings().customSettings,
      fogDensity: settings().fogDensity,
      time: 0,
      timeDelta: 0,
      dof: {
        distance: settings().dofFocusDistance,
        amount: settings().dofAmount,
        showFocusedArea: settings().showFocusedArea,
      },
      camera: {
        position: settings().viewerPosition,
        rotation: cameraRotation,
        motion: [0, 0, 0],
        mode: (() => {
          switch (settings().cameraMode) {
            case "perspective":
              return { type: "perspective", fov: settings().fov };
            case "orthographic":
              return {
                type: "orthographic",
                size: settings().orthographicSize,
              };
            case "panoramic":
              return {
                type: "panoramic",
                angleX: Math.PI * 2,
                angleY: Math.PI,
              };
          }
        })(),
      },
      render: {
        width: settings().width,
        height: settings().height,
        samplesPerPixel: 1,
        exposure: 0.5,
        subdivisions: 1,
        frameid,
        blendWithPreviousFrameFactor: 0.9,
        sampleYieldInterval: 1,
        blendMode: "additive",
        renderMode: settings().previewMode ? "preview" : "full",
      },
      lights: settings().lights.map((light) => {
        return {
          size: light.size,
          position: light.position,
          color: light.color.map((c) => (c * light.strength) / 256) as [
            number,
            number,
            number
          ],
          type: "point",
        };
      }),
    };

    (gl as WebGL2RenderingContext).viewport(
      0,
      0,
      testRenderJob.render.width,
      testRenderJob.render.height
    );

    const accel: [number, number, number] = [0, 0, 0];

    const speed = settings().cameraSpeed;

    if (keysBeingPressed.get("w")) {
      accel[2] += speed;
    }
    if (keysBeingPressed.get("a")) {
      accel[0] -= speed;
    }
    if (keysBeingPressed.get("s")) {
      accel[2] -= speed;
    }
    if (keysBeingPressed.get("d")) {
      accel[0] += speed;
    }
    if (keysBeingPressed.get("shift")) {
      accel[1] -= speed;
    }
    if (keysBeingPressed.get(" ")) {
      accel[1] += speed;
    }

    let shouldSwitchToNewFrame = vec3.length(accel) != 0 || mouseHasMoved > 0;

    // testRenderJob.render.blendWithPreviousFrameFactor = shouldSwitchToNewFrame
    //   ? 0
    //   : 0.9;

    if (previouslySwitchedToNewFrame || settings().requestingNewFrame) {
      setSettings({
        ...settings(),
        requestingNewFrame: false,
      });

      samplesRenderedSoFar = 0;

      frameid++;
      previouslySwitchedToNewFrame = false;
    }
    samplesRenderedSoFar++;

    if (shouldSwitchToNewFrame) previouslySwitchedToNewFrame = true;

    if (settings().renderWhileInMenu || document.pointerLockElement !== null) {
      const result = (
        await doRenderJob(testRenderJob, renderJobContext as RenderJobContext)
      )(makePresenter(samplesRenderedSoFar));

      let done = false;

      while (!done) {
        const step = result.next();
        done = step.done ?? false;

        if (
          step.value &&
          !step.value.success &&
          step.value.why &&
          step.value.why.type == "fragment"
        ) {
          if (settings().shaderErrors != step.value.why.infoLog) {
            setSettings({
              ...settings(),
              shaderErrors: step.value.why.infoLog,
            });
          }
        } else if (settings().shaderErrors != "") {
          setSettings({
            ...settings(),
            shaderErrors: "",
          });
        }
      }
    }

    mouseHasMoved--;

    vec3.transformMat4(accel, accel, testRenderJob.camera.rotation);

    if (vec3.length(accel) != 0) {
      setSettings({
        ...settings(),
        viewerPosition: Array.from(
          vec3.add(vec3.create(), settings().viewerPosition, accel)
        ) as [number, number, number],
      });
    }

    requestAnimationFrame(loop);
  }
  loop();
};

// const slowRenderTest = async (el: HTMLCanvasElement) => {
//   const gl = el.getContext("webgl2");
//   if (!gl) return;
//   gl.getExtension("EXT_color_buffer_float");
//   gl.viewport(0, 0, el.width, el.height);

//   const renderJobContext = await loadRenderJobContext(gl);

//   testRenderJob.render.subdivisions = 2;
//   testRenderJob.render.samplesPerPixel = 128;

//   const result = (
//     await doRenderJob(testRenderJob, renderJobContext as RenderJobContext)
//   )(makePresenter(1));

//   function loop() {
//     let done = result.next().done ?? false;
//     if (!done) requestAnimationFrame(loop);
//   }
//   loop();
// };

function TestComponent() {
  const [settings, setSettings] = createSignal<SettingsData>({
    dofAmount: 0.01,
    dofFocusDistance: 1.5,
    matchScreenResolution: true,
    resolutionFactor: 1,
    width: 1280,
    height: 720,
    rawWidth: 1280,
    rawHeight: 720,
    requestingNewFrame: false,
    samplesRenderedSoFar: 0,
    fov: 1.5,
    fogDensity: 0,
    reflectionIterationCounts: [128, 128, 64, 32, 32].map((e, i) => {
      return { count: e, id: i };
    }),
    cameraMode: "perspective",
    orthographicSize: 1.5,
    renderWhileInMenu: true,
    menuDisplayMode: "always-visible",
    cameraSpeed: 0.01,
    previewMode: true,
    lights: [],
    viewerPosition: [0, 0, 0],
    previewModeDownscaling: 0.25,
    showFocusedArea: false,
    shaderErrors: "",
    customSettings: {},
    shaderCode: `// Diffuse color for the scene as a function of position.
vec3 sceneDiffuseColor(vec3 position) {
  if (length(position) > 35.0) return vec3(0.0);
  return vec3(0.6);
}

// Specular/metallic color for the scene.
vec3 sceneSpecularColor(vec3 position) {
  if (length(position) > 35.0) return vec3(0.0);
  return vec3(0.6);
}

// Specular roughness coefficient (ranges 0-1).
float sceneSpecularRoughness(vec3 position) {
  return 0.2;
}

// Subsurface scattering coefficient. Lower values appear translucent and scatter more.
float sceneSubsurfaceScattering(vec3 position) {
  return 11111115.0;
}

// Color for light rays that undergo subsurface scattering.
vec3 sceneSubsurfaceScatteringColor(vec3 position) {
  if (length(position) > 30.0) return vec3(1.0);
  return vec3(1.0);
}

// Index of refraction for fresnel effects.
float sceneIOR(vec3 position) {
  return 100.0;
}

// Light emission strength.
vec3 sceneEmission(vec3 position) {
  float d = max(normalize(position).y, 0.2);
  vec3 brightColor = vec3(0.7, 0.8, 1.0) * d * 1.0;
  return (length(position) > 36.0) ? (brightColor * 2.00) : vec3(0.0);
}

// Signed distance function describing the scene to be drawn.
float sdf(vec3 position) {  
  float minDist = 9999.9;
  for (float i = -1.0; i < 10.0; i++) {
      float sf = pow(0.3333333333333, i);
      ivec3 index = ivec3(position / 2.0);
      vec3 d = abs(mod(position + vec3(0.5 * sf), sf) - vec3(sf / 2.0)) - vec3(sf / 3.0);
      float dist = length(d) - 0.21 * sf;
      minDist = min(dist, minDist);
  }
  minDist = max(length(position) - 5.0, -minDist);
  return minDist;
}`,
  });

  onMount(async () => {
    setSettings({
      ...settings(),
      shaderCode: await (await fetch("examples/guide.glsl")).text(),
    });
    console.log("GUIDE LOADED");
    console.log(settings().shaderCode);
  });

  // const [upToDateResFactor, setUpToDateResFactor] = createSignal(1);
  // const [upToDatePreviewModeDownscaling, setUpToDatePreviewModeDownscaling] =
  //   createSignal(0.25);
  // const [upToDatePreviewMode, setUpToDatePreviewMode] = createSignal(true);

  let canvas: HTMLCanvasElement;

  const c = (
    <canvas
      ref={(el) => {
        canvas = el;
        function onresize() {
          if (settings().matchScreenResolution) {
            let resFactor =
              settings().resolutionFactor *
              (settings().previewMode ? settings().previewModeDownscaling : 1);

            const rect = el.getBoundingClientRect();

            console.log("dims", rect.width, rect.height);

            setSettings({
              ...settings(),
              width: Math.max(
                1,
                Math.round((rect.width || window.innerWidth) * resFactor)
              ),
              height: Math.max(
                1,
                Math.round((rect.height || window.innerHeight) * resFactor)
              ),
              requestingNewFrame: true,
            });
          }
        }

        window.addEventListener("resize", onresize);

        const resizeObserver = new ResizeObserver(() => onresize());
        resizeObserver.observe(el);

        onresize();

        // computeOnChange(
        //   () => {
        //     onresize();
        //   },
        //   () => settings().menuDisplayMode
        // );

        realtimeMode(el, settings, setSettings);
      }}
      width={settings().width}
      height={settings().height}
      id={
        settings().menuDisplayMode == "separate-tab"
          ? "main-canvas-tab"
          : "main-canvas"
      }
    ></canvas>
  );

  return (
    <div
      class={
        settings().menuDisplayMode == "separate-tab" ? "tabs-container" : ""
      }
    >
      {c}
      <Settings
        captureImage={() => {
          const img = canvas.toDataURL("image/png", 1);
          const a = document.createElement("a");
          a.href = img;
          a.download = "3d-fractal.png";
          a.click();
        }}
        value={settings}
        setValue={(s) => {
          setSettings({
            ...s,
            requestingNewFrame: true,
          });
        }}
      ></Settings>
    </div>
  );
}

render(() => <TestComponent></TestComponent>, document.body);

import { computeOnChange } from "./util/Memoize";
