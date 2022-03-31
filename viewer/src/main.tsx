import * as raymarch from "../../module/build/main.mjs";
import React, { useEffect } from "react";
import * as ReactDOM from "react-dom";
import { quat, vec3 } from "gl-matrix";

import "./index.css";

type KeyPollSource = { [key: string]: boolean };

type KeyOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V? P: never]: any;
}

type test = KeyOfType<NumberInputOptions<string>, number>

interface NumberInputOptions<T> {
  label: string;
  isRange: boolean;
  min: number;
  max: number;
  step: number;
  sensitivity: number;
  state: [T, Function];
  setting: KeyOfType<T, number>;
  inputHandler?: () => void;
}

let isMouseDown = false;

document.addEventListener("mousedown", (e) => {
  isMouseDown = true;
});
document.addEventListener("mouseup", (e) => {
  isMouseDown = false;
});

const NumberInput = <T,>(props: NumberInputOptions<T>) => {
  const [isFocusedOnMe, setIsFocusedOnMe] = React.useState(false);
  const [accumDistance, setAccumDistance] = React.useState(0);
  const [lastSettingValue, setLastSettingValue] = React.useState<number>(
    (props.state[0][props.setting] as unknown) as number
  );

  let getNum = (e) => {
    let value = Number(e.currentTarget.value);
    props.state[1]({
      ...props.state[0],
      [props.setting]: value,
    });
  };

  let screenSpaceToSliderSpace = (x) => {
    return Math.round(x / props.step) * props.step;
  };

  let shouldAddAccumulatedDistanceAgain = true;

  return (
    <div
      className="setting"
      onMouseDown={(e) => {
        setLastSettingValue((props.state[0][props.setting] as unknown) as number);
      }}
      onMouseUp={(e) => {
        document.exitPointerLock();
        if (!isFocusedOnMe) {
          e.currentTarget.focus();
        }
        if (props.inputHandler) props.inputHandler();
      }}
      onMouseMove={(e) => {
        if (isMouseDown) {
          e.currentTarget.requestPointerLock();
          setIsFocusedOnMe(true);
        }
        let value = props.state[0][props.setting];
        if (isMouseDown && document.pointerLockElement == e.currentTarget) {
          e.preventDefault();
          console.log(accumDistance, e.movementX);
          setAccumDistance(
            accumDistance +
              (accumDistance == 0 ? Math.sign(e.movementX) : e.movementX)
          );
          props.state[1]({
            ...props.state[0],
            [props.setting]:
              lastSettingValue +
              screenSpaceToSliderSpace(accumDistance * props.sensitivity),
          });
        } else {
          if (isFocusedOnMe && shouldAddAccumulatedDistanceAgain) {
            setAccumDistance(0);
            setIsFocusedOnMe(false);
            setLastSettingValue((props.state[0][props.setting] as unknown) as number);
            shouldAddAccumulatedDistanceAgain = false;
          }
        }
      }}
    >
      <label>{props.label}</label>
      <input
        disabled={false}
        value={
          Math.floor(
            (lastSettingValue +
              screenSpaceToSliderSpace(accumDistance * props.sensitivity)) *
              1000
          ) / 1000
        }
        type={props.isRange ? "range" : "number"}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={getNum}
        onInput={(e) => {
          if (props.inputHandler) props.inputHandler();
          setLastSettingValue(Number(e.currentTarget.value));
        }}
      ></input>
    </div>
  );
};

const RaymarcherGUI = (props) => {
  let [renderGUIOptions, setRenderGUIOptions] =
    React.useState<RenderTaskGUIOptions>({
      primaryRaymarchingSteps: 64,
      reflections: 3,
      focalPlaneDistance: -0.5,
      circleOfConfusionSize: -3,
      isRealtimeMode: true,
      blendFactor: 0.95,
      cameraSpeed: -2,
      isDoingHighQualityRender: false,
      resolutionFactor: 0.5,
      fogDensity: -0.8,

      hqRaymarchingSteps: 128,
      hqExposureAmount: 1,
      hqSampleCount: 128,
      hqReflections: 6,
      hqWidth: 1920,
      hqHeight: 1080
    });

  props.guiOptions.current = Object.assign({}, renderGUIOptions);

  let getNum = (
    setting: keyof RenderTaskGUIOptions,
    transformer?: (x: number) => number
  ) => {
    if (!transformer) transformer = (e) => e;

    return (e) => {
      let value = transformer(Number(e.currentTarget.value));
      setRenderGUIOptions({
        ...renderGUIOptions,
        [setting]: value,
      });
    };
  };

  let getBool = (setting: keyof RenderTaskGUIOptions) => {
    return (e) => {
      let value = e.currentTarget.checked;
      setRenderGUIOptions({
        ...renderGUIOptions,
        [setting]: value,
      });
    };
  };

  const state: [RenderTaskGUIOptions, Function] = [renderGUIOptions, setRenderGUIOptions];

  return (
    <div id="gui-container">
      <div id="gui-settings">
        <button
          onClick={() =>
            setRenderGUIOptions({
              ...renderGUIOptions,
              isDoingHighQualityRender:
                !renderGUIOptions.isDoingHighQualityRender,
            })
          }
        >
          Do High Quality Render
        </button>
        <h2>High Quality Render Settings</h2>
        <NumberInput
          state={state}
          label="Raymarching Steps"
          isRange={false}
          min={1}
          max={2048}
          step={1}
          sensitivity={0.008}
          setting="hqRaymarchingSteps"
        ></NumberInput>
        <NumberInput
          state={state}
          label="Exposure"
          isRange={false}
          min={0}
          max={10}
          step={0.00001}
          sensitivity={0.008}
          setting="hqExposureAmount"
        ></NumberInput>
        <NumberInput
          state={state}
          label="Sample Count"
          isRange={false}
          min={0}
          max={8192}
          step={1}
          sensitivity={0.008}
          setting="hqSampleCount"
        ></NumberInput>
        <NumberInput
          state={state}
          label="Reflections"
          isRange={false}
          min={0}
          max={32}
          step={1}
          sensitivity={0.008}
          setting="hqReflections"
        ></NumberInput>
        <NumberInput
          state={state}
          label="Image Width"
          isRange={false}
          min={0}
          max={8192}
          step={1}
          sensitivity={0.008}
          setting="hqWidth"
        ></NumberInput>
        <NumberInput
          state={state}
          label="Image Height"
          isRange={false}
          min={0}
          max={8192}
          step={1}
          sensitivity={0.008}
          setting="hqHeight"
        ></NumberInput>


        <h2>Viewer Settings</h2>
        <NumberInput
          state={state}
          label="Camera Speed"
          isRange={false}
          min={-6}
          max={1}
          step={0.0001}
          sensitivity={0.0008}
          setting="cameraSpeed"
        ></NumberInput>
        <h2>Render Settings</h2>
        <NumberInput
          state={state}
          label="Raymarching Steps"
          isRange={false}
          min={0}
          max={128}
          step={1}
          sensitivity={0.008}
          setting="primaryRaymarchingSteps"
        ></NumberInput>
        <NumberInput
          state={state}
          label="Reflections"
          isRange={false}
          min={0}
          max={15}
          step={1}
          sensitivity={0.0008}
          setting="reflections"
        ></NumberInput>
        <NumberInput
          state={state}
          label="DOF Focal Plane Distance"
          isRange={false}
          min={-4}
          max={4}
          step={0.0001}
          sensitivity={0.0008}
          setting="focalPlaneDistance"
        ></NumberInput>
        <NumberInput
          state={state}
          label="Circle of Confusion Size"
          isRange={false}
          min={-4}
          max={1}
          step={0.0001}
          sensitivity={0.0008}
          setting="circleOfConfusionSize"
        ></NumberInput>
        <NumberInput
          state={state}
          label="Resolution Factor"
          isRange={false}
          min={0}
          max={2}
          step={0.0001}
          sensitivity={0.0008}
          setting="resolutionFactor"
          inputHandler={() => {
            window.dispatchEvent(new Event("resize"));
          }}
        ></NumberInput>
        <NumberInput
          state={state}
          label="Fog Density"
          isRange={false}
          min={-4}
          max={4}
          step={0.0001}
          sensitivity={0.0008}
          setting="fogDensity"
        ></NumberInput>
        <NumberInput
          state={state}
          label="Blend Factor"
          isRange={false}
          min={0}
          max={1}
          step={0.0001}
          sensitivity={0.0008}
          setting="blendFactor"
        ></NumberInput>
        <div className="setting">
          <label>Realtime Mode</label>
          <input
            type="checkbox"
            checked={renderGUIOptions.isRealtimeMode}
            onChange={getBool("isRealtimeMode")}
          ></input>
        </div>
      </div>
    </div>
  );
};

const MainCanvas = (props) => {
  let canvasRef = (canvasDomNode) => {
    canvasDomNode.addEventListener("click", (e) => {
      canvasDomNode.requestPointerLock();
    });

    let renderState;
    let keysDown: KeyPollSource = {};
    document.addEventListener("keydown", (e) => {
      keysDown[e.key.toLowerCase()] = true;
    });
    document.addEventListener("keyup", (e) => {
      keysDown[e.key.toLowerCase()] = false;
    });

    let mouseMoveX = 0;
    let mouseMoveY = 0;
    document.addEventListener("mousemove", (e) => {
      mouseMoveX += e.movementX;
      mouseMoveY += e.movementY;
    });

    const resizeCanvas = (width, height) => {
      if (Math.round(canvasDomNode.width) == Math.round(width) && Math.round(canvasDomNode.height) == Math.round(height)) return;
      canvasDomNode.width = Math.max(
        width,
        1
      );
      canvasDomNode.height = Math.max(
        height,
        1
      );
      renderState = raymarch.createRenderState({
        width: canvasDomNode.width,
        height: canvasDomNode.height,
        canvas: canvasDomNode,
      });
    }

    window.addEventListener("resize", () => {
      const guiOpts = props.guiOptions.current;
      if (!guiOpts.isDoingHighQualityRender) {
        resizeCanvas(
          window.innerWidth * props.guiOptions.current.resolutionFactor,
          window.innerHeight * props.guiOptions.current.resolutionFactor
        );
      }
    });

    let pos: vec3 = [0, 0, 3.17];
    let rot: quat = [0, 0, 0, 0];
    quat.rotateY(quat.identity(rot), rot, Math.PI);

    let highQualityRenderTask;
    let isHighQualityRenderTaskDone = false;

    let hasNotResized = true;


    function loop() {
      const isControllingViewer = document.pointerLockElement === canvasDomNode;
      const guiOpts = props.guiOptions.current;
      if (guiOpts) {
        if (hasNotResized) {
          window.dispatchEvent(new Event("resize"));
          hasNotResized = false;
        }
        if (guiOpts.isDoingHighQualityRender) {
          if (!highQualityRenderTask) {
            resizeCanvas(guiOpts.hqWidth, guiOpts.hqHeight);
            raymarch.clear(renderState);
            //raymarch.present(renderState);
            //window.dispatchEvent(new Event("resize"));
            isHighQualityRenderTaskDone = false;
            highQualityRenderTask = raymarch.doRenderTask({
              state: renderState,
              subdivX: 4,
              subdivY: 4,
              iterations: guiOpts.hqSampleCount,
              shaderCompileOptions: {
                change: false,
                isRealtimeMode: false,
              },

              uniforms: {
                camera: {
                  position: pos,
                  rotation: rot,
                },
                fovs: [(1.5 * window.innerWidth) / window.innerHeight, 1.5],
                primaryRaymarchingSteps: guiOpts.hqRaymarchingSteps,
                reflections: guiOpts.hqReflections,
                isAdditive: true,
                blendFactor: guiOpts.hqExposureAmount / guiOpts.hqSampleCount,
                dof: {
                  distance: Math.pow(10, guiOpts.focalPlaneDistance),
                  amount: Math.pow(10, guiOpts.circleOfConfusionSize),
                }, 
                fogDensity: Math.pow(10, guiOpts.fogDensity),
              },
            });
          }

          if (!isHighQualityRenderTaskDone) {
            let taskProgress = highQualityRenderTask.next();
            isHighQualityRenderTaskDone = taskProgress.done;
          }
        } else {
          highQualityRenderTask = undefined;
          let movementVec: vec3 = [0, 0, 0];
          if (isControllingViewer) {
            quat.rotateY(rot, rot, mouseMoveX / 300);
            quat.rotateX(rot, rot, mouseMoveY / 300);
            if (keysDown.w) {
              vec3.add(movementVec, movementVec, [0, 0, 1]);
            }
            if (keysDown.a) {
              vec3.add(movementVec, movementVec, [-1, 0, 0]);
            }
            if (keysDown.s) {
              vec3.add(movementVec, movementVec, [0, 0, -1]);
            }
            if (keysDown.d) {
              vec3.add(movementVec, movementVec, [1, 0, 0]);
            }
            if (keysDown.shift) {
              vec3.add(movementVec, movementVec, [0, -1, 0]);
            }
            if (keysDown[" "]) {
              vec3.add(movementVec, movementVec, [0, 1, 0]);
            }
            let speed = Math.pow(10, guiOpts.cameraSpeed);
            vec3.transformQuat(movementVec, movementVec, rot);
            vec3.add(
              pos,
              pos,
              vec3.mul(movementVec, movementVec, [speed, speed, speed])
            );
          }
          let deltaRotation = isControllingViewer
            ? Math.hypot(mouseMoveX, mouseMoveY)
            : 0;
          mouseMoveX = 0;
          mouseMoveY = 0;
          let renderTask = raymarch.doRenderTask({
            state: renderState,
            subdivX: 1,
            subdivY: 1,
            iterations: 1,
            shaderCompileOptions: {
              change: false,
              isRealtimeMode: guiOpts.isRealtimeMode,
            },

            uniforms: {
              camera: {
                position: pos,
                rotation: rot,
              },
              fovs: [(1.5 * window.innerWidth) / window.innerHeight, 1.5],
              primaryRaymarchingSteps: guiOpts.primaryRaymarchingSteps,
              reflections: guiOpts.reflections,
              isAdditive: false,
              blendFactor:
                vec3.length(movementVec) == 0 && deltaRotation == 0
                  ? guiOpts.blendFactor
                  : 0,
              dof: {
                distance: Math.pow(10, guiOpts.focalPlaneDistance),
                amount: Math.pow(10, guiOpts.circleOfConfusionSize),
              },
              fogDensity: Math.pow(10, guiOpts.fogDensity),
            },
          });
          let task = renderTask.next();
        }
      }

      requestAnimationFrame(loop);
    }
    loop();
  };
  return (
    <canvas ref={canvasRef} id="canvas" width="1920" height="1080"></canvas>
  );
};

interface RenderTaskGUIOptions {
  primaryRaymarchingSteps: number;
  reflections: number;
  focalPlaneDistance: number;
  circleOfConfusionSize: number;
  isRealtimeMode: boolean;
  blendFactor: number;
  cameraSpeed: number;
  isDoingHighQualityRender: boolean;
  resolutionFactor: number;
  fogDensity: number;

  hqReflections: number;
  hqRaymarchingSteps: number;
  hqSampleCount: number;
  hqExposureAmount: number;
  hqWidth: number;
  hqHeight: number;
}

const Raymarcher = () => {
  let renderTaskGUIOptions = React.useRef<RenderTaskGUIOptions>();

  return (
    <React.Fragment>
      <MainCanvas guiOptions={renderTaskGUIOptions}></MainCanvas>
      <RaymarcherGUI guiOptions={renderTaskGUIOptions}></RaymarcherGUI>
    </React.Fragment>
  );
};

async function main() {
  await raymarch.loadShaders();
  ReactDOM.render(
    <Raymarcher></Raymarcher>,
    document.getElementById("app-container")
  );
}

main();
