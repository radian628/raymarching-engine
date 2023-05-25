import { createEffect, createSignal, onMount } from "solid-js";
import { Collapsible, Named } from "../inputs/Named";
import { SettingsData } from "./Settings";
import { GLSLEditor } from "./shader-editor/GLSLEditor";
import {
  CustomShaderParam,
  CustomShaderParamError,
} from "./shader-editor/Validate";

export function ShaderCodeSettings(props: {
  value: () => SettingsData;
  setValue: (s: SettingsData) => void;
  customSettings: () => (CustomShaderParam | CustomShaderParamError)[];
}) {
  const [localShaderCode, setLocalShaderCode] = createSignal(
    props.value().shaderCode
  );

  createEffect(() => {
    setLocalShaderCode(props.value().shaderCode);
  });

  const [preset, setPreset] = createSignal("guide.glsl");

  let stickyTab: HTMLDivElement;
  let container: HTMLDivElement;

  onMount(() => {
    container.addEventListener("wheel", (e) => {
      const stickyRect = stickyTab.getBoundingClientRect();
      if (stickyRect.top < 1) {
        stickyTab.style.backgroundColor = "#00000088";
        stickyTab.style.borderBottomColor = "#ffffff88";
      } else {
        stickyTab.style.backgroundColor = "#00000000";
        stickyTab.style.borderBottomColor = "#ffffff00";
      }
    });
  });

  return (
    <div ref={(el) => (container = el)}>
      <div class="shader-sticky-tab" ref={(el) => (stickyTab = el)}>
        <Named
          name=""
          tooltip="Recompiles the shader. You can also use Ctrl+S to recompile."
        >
          <button
            onclick={(e) => {
              props.setValue({
                ...props.value(),
                shaderCode: localShaderCode(),
              });
            }}
          >
            Recompile
          </button>
        </Named>
        <Named
          name=""
          tooltip="Select one of the shaders from this dropdown to view it. This will overwrite all the code below."
        >
          <select
            value={preset()}
            onChange={async (e) => {
              setPreset(e.currentTarget.value);
              const newShaderCode = await (
                await fetch("examples/" + e.currentTarget.value)
              ).text();
              setLocalShaderCode(newShaderCode);
              props.setValue({
                ...props.value(),
                shaderCode: newShaderCode,
              });
            }}
          >
            <option value="guide.glsl">guide.glsl</option>
            <option value="fractal1.glsl">fractal1.glsl</option>
            <option value="menger-sponge.glsl">menger-sponge.glsl</option>
            <option value="rotation-fractal.glsl">rotation-fractal.glsl</option>
            <option value="tree.glsl">tree.glsl</option>
            <option value="smooth-tree.glsl">smooth-tree.glsl</option>
          </select>
        </Named>
      </div>
      {props.value().shaderErrors && <p>{props.value().shaderErrors}</p>}
      <GLSLEditor
        src={localShaderCode}
        setSrc={setLocalShaderCode}
        infoLog={() => props.value().shaderErrors}
        onSave={() => {
          props.setValue({
            ...props.value(),
            shaderCode: localShaderCode(),
          });
        }}
        extraErrors={() =>
          (
            props
              .customSettings()
              .filter((s) => !s.success) as CustomShaderParamError[]
          ).map((s) => {
            return {
              message: s.reason,
              start: s.start,
              end: s.end,
            };
          })
        }
      ></GLSLEditor>
    </div>
  );
}
