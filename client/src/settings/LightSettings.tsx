import { ArrayInput } from "../inputs/ArrayInput";
import { ColorInput } from "../inputs/ColorInput";
import { Collapsible, Named } from "../inputs/Named";
import { NumberInput } from "../inputs/NumberInput";
import { createPropSetterMaker, SettingsData } from "./Settings";

export type Light = {
  position: [number, number, number];
  color: [number, number, number];
  size: number;
  strength: number;
  id: number;
};
export function SingleLightSettings(props: {
  value: () => Light;
  setValue: (v: Light) => void;
  lightPosition: () => [number, number, number];
}) {
  const set = createPropSetterMaker(props.value, props.setValue);
  return (
    <div class="horizontal-container single-light">
      <div class="vertical-container">
        <Named
          name="Color"
          tooltip="Color of the light source. Click to modify."
        >
          <ColorInput
            value={() => props.value().color}
            setValue={set("color")}
          ></ColorInput>
        </Named>
        <Named
          name=""
          tooltip="Click to set the position of the light source to the current position of the viewer."
        >
          <button
            onClick={(e) => {
              set("position")(props.lightPosition());
              console.log(props.lightPosition());
            }}
          >
            Reposition
          </button>
        </Named>
      </div>
      <div class="vertical-container">
        <Named
          name="Radius"
          tooltip="Radius of the point light source. Lights are treated as spheres."
        >
          <NumberInput
            value={() => props.value().size}
            setValue={set("size")}
            sensitivity={0.01}
            updateInRealTime
          ></NumberInput>
        </Named>
        <Named name="Strength" tooltip="Brightness of the light source.">
          <NumberInput
            value={() => props.value().strength}
            setValue={set("strength")}
            sensitivity={0.01}
            updateInRealTime
          ></NumberInput>
        </Named>
      </div>
    </div>
  );
}

export function LightSettings(props: {
  value: () => SettingsData;
  setValue: (v: SettingsData) => void;
  lightPosition: () => [number, number, number];
}) {
  const set = createPropSetterMaker(props.value, props.setValue);
  return (
    <Collapsible name="Lights">
      <ArrayInput
        value={() => props.value().lights}
        setValue={set("lights")}
        defaultValue={{
          position: [0, 0, 0],
          strength: 3,
          size: 0,
          color: [255, 255, 255],
        }}
      >
        {(props2) => (
          <div class="horizontal-container">
            <SingleLightSettings
              value={props2.value}
              setValue={props2.setValue}
              lightPosition={props.lightPosition}
            ></SingleLightSettings>
            {props2.deleteButton}
          </div>
        )}
      </ArrayInput>
    </Collapsible>
  );
}
