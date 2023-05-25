import { createEffect, createSignal } from "solid-js";
import { ArrayInput } from "../inputs/ArrayInput";
import { BooleanInput } from "../inputs/BooleanInput";
import { EnumInput } from "../inputs/EnumInput";
import { Collapsible, Named } from "../inputs/Named";
import { NumberInput } from "../inputs/NumberInput";
import { createPropSetterMaker, SettingsData } from "./Settings";

export function CameraSettings(props: {
  value: () => SettingsData;
  setValue: (s: SettingsData) => void;
}) {
  const set = createPropSetterMaker(props.value, props.setValue);

  return (
    <Collapsible name="Camera">
      <Named name="Camera Mode" tooltip="The projection used by the camera.">
        <EnumInput
          value={() => props.value().cameraMode}
          setValue={set("cameraMode")}
          variants={[
            ["perspective", "Perspective"],
            ["orthographic", "Orthographic"],
            ["panoramic", "Panoramic"],
          ]}
        ></EnumInput>
      </Named>
      {props.value().cameraMode == "perspective" ? (
        <Named
          name="FOV (radians)"
          tooltip="Field of view on the Y-axis in radians."
        >
          <NumberInput
            min={0}
            value={() => props.value().fov}
            setValue={set("fov")}
            sensitivity={0.0003}
            updateInRealTime={true}
          ></NumberInput>
        </Named>
      ) : props.value().cameraMode == "orthographic" ? (
        <div>
          <Named name="Size" tooltip="Size of the orthographic camera sensor.">
            <NumberInput
              min={0}
              value={() => props.value().orthographicSize}
              setValue={set("orthographicSize")}
              sensitivity={0.0003}
              updateInRealTime={true}
            ></NumberInput>
          </Named>
        </div>
      ) : undefined}
    </Collapsible>
  );
}
