import { Show, createSignal } from "solid-js";
import { ArrayInput } from "../inputs/ArrayInput";
import { BooleanInput } from "../inputs/BooleanInput";
import { EnumInput } from "../inputs/EnumInput";
import {
  Collapsible,
  Named,
  TooltipInfo,
  TooltipInfoType,
} from "../inputs/Named";
import { NumberInput } from "../inputs/NumberInput";
import { CameraSettings } from "./CameraSettings";
import { ControlsSettings } from "./ControlsSettings";
import { Light, LightSettings } from "./LightSettings";
import { RenderSettings } from "./RenderSettings";
import { GLSLEditor } from "./shader-editor/GLSLEditor";
import { ShaderCodeSettings } from "./ShaderCodeSettings";
import { CustomSettings } from "./CustomSettings";
import { UniformData } from "../renderer/Uniforms";
import {
  CustomShaderParam,
  CustomShaderParamError,
} from "./shader-editor/Validate";

export type SettingsData = {
  dofAmount: number;
  dofFocusDistance: number;
  matchScreenResolution: boolean;
  resolutionFactor: number;
  width: number;
  height: number;
  rawWidth: number;
  rawHeight: number;
  requestingNewFrame: boolean;
  samplesRenderedSoFar: number;
  previewMode: boolean;
  previewModeDownscaling: number;

  cameraMode: "perspective" | "orthographic" | "panoramic";
  fov: number;
  orthographicSize: number;

  fogDensity: number;

  reflectionIterationCounts: { id: number; count: number }[];

  //controls
  cameraSpeed: number;
  renderWhileInMenu: boolean;
  menuDisplayMode: "always-visible" | "hide" | "separate-tab";

  lights: Light[];

  viewerPosition: [number, number, number];

  shaderCode: string;

  showFocusedArea: boolean;

  shaderErrors: string;

  customSettings: Record<string, UniformData>;
};

export function createPropSetterMaker<T extends {}>(
  value: () => T,
  setValue: (t: T) => void,
  transform?: (t: T) => T
) {
  let transform2 = transform ?? ((t) => t);

  return function <K extends keyof T>(prop: K) {
    return function (newValue: T[K]) {
      setValue(
        transform2({
          ...value(),
          [prop]: newValue,
        })
      );
    };
  };
}

export function SettingsSettingsTab(props: {
  value: () => SettingsData;
  setValue: (s: SettingsData) => void;
  customSettings: () => (CustomShaderParam | CustomShaderParamError)[];
  setCustomSettings: (
    s: (CustomShaderParam | CustomShaderParamError)[]
  ) => void;
}) {
  const set = createPropSetterMaker(props.value, props.setValue);
  return (
    <>
      <ControlsSettings
        value={props.value}
        setValue={props.setValue}
      ></ControlsSettings>

      <RenderSettings
        value={props.value}
        setValue={props.setValue}
      ></RenderSettings>

      <Collapsible name="DoF">
        <Named
          name="Amount"
          tooltip="Strength of the depth of field effect. Higher values yield blurrier results in out-of-focus areas. Set to 0 to disable entirely."
        >
          <NumberInput
            min={0}
            value={() => props.value().dofAmount}
            setValue={set("dofAmount")}
            sensitivity={0.003}
            updateInRealTime={true}
            slideMode="log"
          ></NumberInput>
        </Named>
        <Named
          name="Focus Distance"
          tooltip="Distance at which to focus the camera for the purposes of depth of field. Areas in focus will be highlighted."
        >
          <NumberInput
            min={0}
            value={() => props.value().dofFocusDistance}
            setValue={set("dofFocusDistance")}
            sensitivity={0.01}
            updateInRealTime={true}
            onSlideStart={() => {
              set("showFocusedArea")(true);
            }}
            onSlideEnd={() => {
              set("showFocusedArea")(false);
            }}
            slideMode="log"
          ></NumberInput>
        </Named>
      </Collapsible>
      <CameraSettings
        value={props.value}
        setValue={props.setValue}
      ></CameraSettings>

      <LightSettings
        value={props.value}
        setValue={props.setValue}
        lightPosition={() => props.value().viewerPosition}
      ></LightSettings>

      <CustomSettings
        value={props.value}
        setValue={props.setValue}
        position={() => props.value().viewerPosition}
        customSettings={props.customSettings}
        setCustomSettings={props.setCustomSettings}
      ></CustomSettings>

      <Collapsible name="Other">
        <Named
          name="Fog Density"
          tooltip="Density of the fog uniformly distributed throughout the scene."
        >
          <NumberInput
            min={0}
            value={() => props.value().fogDensity}
            setValue={set("fogDensity")}
            sensitivity={0.0003}
            updateInRealTime={true}
          ></NumberInput>
        </Named>
      </Collapsible>
    </>
  );
}

export function Settings(props: {
  value: () => SettingsData;
  setValue: (s: SettingsData) => void;
  captureImage: () => void;
}) {
  const set = createPropSetterMaker(props.value, props.setValue);

  const [customSettings, setCustomSettings] = createSignal<
    (CustomShaderParam | CustomShaderParamError)[]
  >([]);

  const [tooltipInfo, setTooltipInfo] = createSignal<TooltipInfoType>({
    name: "Name",
    tooltip: "Tooltip",
    visible: false,
    x: 0,
    y: 0,
  });

  const [openSettingsTab, setOpenSettingsTab] = createSignal<
    "settings" | "shader"
  >("settings");

  return (
    <TooltipInfo.Provider
      value={[tooltipInfo, (info: TooltipInfoType) => setTooltipInfo(info)]}
    >
      <div
        class={
          "settings" +
          // (props.value().menuDisplayMode == "hide" ? " hidden-settings" : "")
          {
            "always-visible": " floating-settings",
            hide: " floating-settings hidden-settings",
            "separate-tab": " separate-tab-settings",
          }[props.value().menuDisplayMode]
        }
      >
        <h1>Raymarching Engine</h1>
        <EnumInput
          value={openSettingsTab}
          setValue={setOpenSettingsTab}
          variants={[
            ["settings", "Settings"],
            ["shader", "Shader"],
          ]}
        ></EnumInput>
        <button
          onClick={() => {
            props.captureImage();
          }}
        >
          Capture Image
        </button>
        {
          <div
            style={{ display: openSettingsTab() == "settings" ? "" : "none" }}
          >
            <SettingsSettingsTab
              value={props.value}
              setValue={props.setValue}
              customSettings={customSettings}
              setCustomSettings={setCustomSettings}
            ></SettingsSettingsTab>
          </div>
        }
        {
          <div style={{ display: openSettingsTab() == "shader" ? "" : "none" }}>
            <ShaderCodeSettings
              value={props.value}
              setValue={props.setValue}
              customSettings={customSettings}
            ></ShaderCodeSettings>
          </div>
        }
      </div>
      <div
        class="tooltip"
        style={{
          display: tooltipInfo().visible ? "" : "none",
          top: `${tooltipInfo().y}px`,
          left: `${tooltipInfo().x}px`,
        }}
      >
        <h2>{tooltipInfo().name}</h2>
        {tooltipInfo().tooltip}
      </div>
    </TooltipInfo.Provider>
  );
}
