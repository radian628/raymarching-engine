import { ArrayInput } from "../inputs/ArrayInput";
import { BooleanInput } from "../inputs/BooleanInput";
import { Collapsible, Named } from "../inputs/Named";
import { NumberInput } from "../inputs/NumberInput";
import { createPropSetterMaker, SettingsData } from "./Settings";

export function RenderSettings(props: {
  value: () => SettingsData;
  setValue: (s: SettingsData) => void;
}) {
  const set = createPropSetterMaker(props.value, props.setValue, (settings) => {
    let resFactor =
      settings.resolutionFactor *
      (settings.previewMode ? settings.previewModeDownscaling : 1);

    let w = settings.matchScreenResolution
      ? window.innerWidth
      : settings.rawWidth;
    let h = settings.matchScreenResolution
      ? window.innerHeight
      : settings.rawHeight;

    return {
      ...settings,
      width: Math.round(w * resFactor),
      height: Math.round(h * resFactor),
      requestingNewFrame: true,
    };
  });
  return (
    <Collapsible name="Render">
      <Named
        name="Preview Mode"
        tooltip="Enable/disable preview mode for quick camera positioning."
      >
        <BooleanInput
          value={() => props.value().previewMode}
          setValue={set("previewMode")}
        ></BooleanInput>
      </Named>
      {props.value().previewMode && (
        <Named
          name="Preview Mode Downscaling"
          tooltip="When in preview mode, reduce resolution by this proportion. E.g. if this is 0.5 and the normal resolution is 1000x500, preview mode resolution will be 500x250."
        >
          <NumberInput
            value={() => props.value().previewModeDownscaling}
            setValue={set("previewModeDownscaling")}
            sensitivity={0.001}
          ></NumberInput>
        </Named>
      )}
      <Named
        name="Match Screen Resolution"
        tooltip="Automatically adjust render resolution to match screen resolution."
      >
        <BooleanInput
          value={() => props.value().matchScreenResolution}
          setValue={set("matchScreenResolution")}
        ></BooleanInput>
      </Named>
      <div class="subsection">
        {props.value().matchScreenResolution && (
          <Named
            name="Resolution Factor"
            tooltip="Proportionality constant between render resolution and screen resolution. For instance, if this is 0.25 and the screen is 2000x1000, the render will be 500x250."
          >
            <NumberInput
              min={0}
              value={() => props.value().resolutionFactor}
              setValue={set("resolutionFactor")}
              sensitivity={0.001}
            ></NumberInput>
          </Named>
        )}
        {!props.value().matchScreenResolution && (
          <>
            <Named name="Width" tooltip="Measured in pixels.">
              <NumberInput
                min={0}
                step={1}
                value={() => props.value().rawWidth}
                setValue={set("rawWidth")}
                sensitivity={0.1}
              ></NumberInput>
            </Named>
            <Named name="Height" tooltip="Measured in pixels.">
              <NumberInput
                min={0}
                step={1}
                value={() => props.value().rawHeight}
                setValue={set("rawHeight")}
                sensitivity={0.1}
              ></NumberInput>
            </Named>
          </>
        )}
      </div>
      <Named
        name="Raymarching Step Counts"
        tooltip="Number of raymarching steps for each reflection. The first entry is the first reflection, the next is the next reflection, et cetera. The number of entries in this list is the number of reflections."
        vertical
      >
        <ArrayInput
          value={() => props.value().reflectionIterationCounts}
          setValue={set("reflectionIterationCounts")}
          defaultValue={{ count: 32 }}
        >
          {(props) => (
            <>
              <NumberInput
                value={() => props.value().count}
                setValue={(n) =>
                  props.setValue({ id: props.value().id, count: n })
                }
                min={0}
                step={1}
                sensitivity={0.1}
              ></NumberInput>
              {props.deleteButton}
            </>
          )}
        </ArrayInput>
      </Named>
    </Collapsible>
  );
}
