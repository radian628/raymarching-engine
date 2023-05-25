import { createSignal } from "solid-js";
import { ArrayInput } from "../inputs/ArrayInput";
import { BooleanInput } from "../inputs/BooleanInput";
import { EnumInput } from "../inputs/EnumInput";
import { Collapsible, Named } from "../inputs/Named";
import { NumberInput } from "../inputs/NumberInput";
import { createPropSetterMaker, SettingsData } from "./Settings";

export function ControlsSettings(props: {
  value: () => SettingsData;
  setValue: (s: SettingsData) => void;
}) {
  const set = createPropSetterMaker(props.value, props.setValue);

  return (
    <Collapsible name="Controls">
      <Named name="Speed" tooltip="Speed of the viewer.">
        <NumberInput
          min={0}
          value={() => props.value().cameraSpeed}
          setValue={set("cameraSpeed")}
          sensitivity={0.001}
          updateInRealTime={true}
          slideMode="log"
        ></NumberInput>
      </Named>
      <Named
        name="Render while in Menu"
        tooltip="Keep rendering even when not controlling the viewer."
      >
        <BooleanInput
          value={() => props.value().renderWhileInMenu}
          setValue={set("renderWhileInMenu")}
        ></BooleanInput>
      </Named>
      <Named
        name="Menu Display Mode"
        tooltip={
          <ul>
            <li>Always Visible: Always show the menu.</li>
            <li>
              Hidden: Hide the menu when not in use. Hover over it to view.
            </li>
            <li>
              Separate Tab: Split the screen, putting the menu on one side and
              the display on the other.
            </li>
          </ul>
        }
      >
        <EnumInput
          value={() => props.value().menuDisplayMode}
          setValue={set("menuDisplayMode")}
          variants={[
            ["always-visible", "Always Visible"],
            ["hide", "Hidden"],
            ["separate-tab", "Separate Tab"],
          ]}
        ></EnumInput>
      </Named>
    </Collapsible>
  );
}
