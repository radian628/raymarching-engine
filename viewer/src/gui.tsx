import React from "react";
import { PointLightState, RenderTaskGUIOptions, CameraTransform } from "./common";
export type KeyPollSource = { [key: string]: boolean };

type KeyOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V? P: never]: any;
}

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

function getColorHexString(color: [number, number, number]) {
  return "#" + color.map(c => c.toString(16)).join("");
}

function getColorArray(color: string): [number, number, number] {
  return [
    parseInt(color.slice(1,3), 16) / 255,
    parseInt(color.slice(3,5), 16) / 255,
    parseInt(color.slice(5,7), 16) / 255,
  ]
}

const PointLightInput = (props: { cameraTransform: React.MutableRefObject<CameraTransform>, state: UseStateReturnType<RenderTaskGUIOptions>, index: number }) => {

  //@ts-ignore
  let color = getColorHexString(props.state[0].pointLights[props.index].color.map(c => c * 255));
  return (
    <li>
      <input type="color" value={color}
        onInput={e => {
          let newPointLightsArray = props.state[0].pointLights.slice();
          newPointLightsArray[props.index].color = getColorArray(e.currentTarget.value);
          props.state[1]({
            ...props.state[0],
            pointLights: newPointLightsArray
          });
        }}
      ></input>
      <NumberInput
        state={[props.state[0].pointLights[props.index], value => {
          let newPointLightsArray = props.state[0].pointLights.slice();
          newPointLightsArray[props.index].brightness = value.brightness;
          props.state[1]({
            ...props.state[0],
            pointLights: newPointLightsArray
          });
        }]}
        label="Brightness"
        min={0}
        max={1000}
        sensitivity={0.008}
        isRange={false}
        step={0.000001}
        setting={"brightness"}
      ></NumberInput>
      <button onClick={e => {
        let newPointLightsArray = props.state[0].pointLights.slice();
        newPointLightsArray[props.index].position = props.cameraTransform.current.position.slice() as [number, number, number];
        console.log("POSITION", props.cameraTransform.current.position);
        props.state[1]({
          ...props.state[0],
          pointLights: newPointLightsArray
        });
      }}>Set Position</button>
    </li>
  )
}

type UseStateReturnType<T> = [T, React.Dispatch<React.SetStateAction<T>>];

const PointLightInputList = (props: { cameraTransform: React.MutableRefObject<CameraTransform>, state: UseStateReturnType<RenderTaskGUIOptions>}) => {
  console.log(props.state[0].pointLights);
  return (
    <React.Fragment>
      <button onClick={() => {
        let newPointLights = props.state[0].pointLights.concat([{
          position: [0, 0, 0],
          brightness: 0,
          color: [1.0, 1.0, 1.0]
        }]);
        props.state[1]({
          ...props.state[0],
          pointLights: newPointLights
        });
      }}>Add Light</button>
      <button onClick={() => {
        let newPointLights = props.state[0].pointLights.slice(0, -1);
        props.state[1]({
          ...props.state[0],
          pointLights: newPointLights
        });
      }}>Remove Last Light</button>
      <ul>
        {props.state[0].pointLights.map((pl, i) => {
          return <PointLightInput cameraTransform={props.cameraTransform} state={props.state} index={i}></PointLightInput>
        })}
      </ul>
    </React.Fragment>
  )
}



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

export const RaymarcherGUI = (props) => {
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

      pointLights: [],

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

  const state: UseStateReturnType<RenderTaskGUIOptions> = [renderGUIOptions, setRenderGUIOptions];

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
        <PointLightInputList cameraTransform={props.cameraTransform} state={state}></PointLightInputList>
      </div>
    </div>
  );
};