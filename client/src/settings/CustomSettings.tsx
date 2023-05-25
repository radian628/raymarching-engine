import { createEffect, createSignal } from "solid-js";
import { Collapsible, Named } from "../inputs/Named";
import {
  CustomShaderParam,
  CustomShaderParamError,
} from "./shader-editor/Validate";
import { computeOnChange } from "../util/Memoize";
import { SettingsData, createPropSetterMaker } from "./Settings";
import { UniformData } from "../renderer/Uniforms";
import { NumberInput } from "../inputs/NumberInput";
import { ColorInput } from "../inputs/ColorInput";
import { BooleanInput } from "../inputs/BooleanInput";
import { getCustomShaderParams } from "./shader-editor/CustomShaderParamParser";

export function CustomSetting(props: {
  value: () => Record<string, UniformData>;
  setValue: (s: Record<string, UniformData>) => void;
  position: () => [number, number, number];
  setup: CustomShaderParam;
}) {
  const set = createPropSetterMaker(props.value, props.setValue);

  return (
    <Named name={props.setup.name} tooltip={props.setup.tooltip}>
      {props.setup.formats.includes("numerical") &&
        new Array(props.setup.quantity).fill(0).map((e, i) => {
          return (
            <NumberInput
              value={() =>
                props.value()[props.setup.internalName]?.data[i] ?? 0
              }
              setValue={(v) => {
                if (!props.value()[props.setup.internalName]) {
                  set(props.setup.internalName)({
                    type: props.setup.type,
                    count: props.setup.quantity,
                    //@ts-ignore
                    data: new Array(props.setup.quantity).fill(0),
                  });
                }
                set(props.setup.internalName)({
                  ...props.value()[props.setup.internalName],
                  //@ts-ignore
                  data: props
                    .value()
                    [props.setup.internalName].data.map((e, j) =>
                      j == i ? v : e
                    ),
                });
              }}
              min={props.setup.min}
              max={props.setup.max}
              step={props.setup.step}
              sensitivity={props.setup.sensitivity}
              slideMode={props.setup.scale}
              updateInRealTime
            ></NumberInput>
          );
        })}
      {props.setup.formats.includes("color") &&
        props.setup.type == "f" &&
        props.setup.quantity == 3 && (
          <ColorInput
            value={() =>
              (props
                .value()
                [props.setup.internalName]?.data.map((e) => e * 256) as [
                number,
                number,
                number
              ]) ?? [0, 0, 0]
            }
            setValue={(v) => {
              set(props.setup.internalName)({
                type: "f",
                count: 3,
                data: v.map((e) => e / 256) as [number, number, number],
              });
            }}
          ></ColorInput>
        )}
      {props.setup.formats.includes("position") &&
        props.setup.type == "f" &&
        props.setup.quantity == 3 && (
          <Named
            name=""
            tooltip="Click to set this variable to the (X, Y, Z) position of the viewer."
          >
            <button
              onClick={(e) => {
                set(props.setup.internalName)({
                  type: "f",
                  count: 3,
                  data: props.position(),
                });
              }}
            >
              Reposition
            </button>
          </Named>
        )}
      {props.setup.formats.includes("checkbox") &&
        new Array(props.setup.quantity).fill(0).map((e, i) => {
          return (
            <BooleanInput
              value={() =>
                (props.value()[props.setup.internalName]?.data[i] ?? 0) != 0
              }
              setValue={(v) => {
                if (!props.value()[props.setup.internalName]) {
                  set(props.setup.internalName)({
                    type: props.setup.type,
                    count: props.setup.quantity,
                    //@ts-ignore
                    data: new Array(props.setup.quantity).fill(0),
                  });
                }
                set(props.setup.internalName)({
                  ...props.value()[props.setup.internalName],
                  //@ts-ignore
                  data: props
                    .value()
                    [props.setup.internalName].data.map((e, j) =>
                      j == i ? (v ? 1 : 0) : e
                    ),
                });
              }}
            ></BooleanInput>
          );
        })}
    </Named>
  );
}

export const filterOutCustomShaderParamErrors = (
  l: (CustomShaderParam | CustomShaderParamError)[]
) => l.filter((p) => p.success) as CustomShaderParam[];

export function CustomSettings(props: {
  value: () => SettingsData;
  setValue: (s: SettingsData) => void;
  position: () => [number, number, number];
  customSettings: () => (CustomShaderParam | CustomShaderParamError)[];
  setCustomSettings: (
    s: (CustomShaderParam | CustomShaderParamError)[]
  ) => void;
}) {
  computeOnChange(
    () => {
      const paramsAndErrors = getCustomShaderParams(props.value().shaderCode);
      console.log(paramsAndErrors);
      // const params = paramsAndErrors.filter(
      //   (p) => p.success
      // ) as CustomShaderParam[];
      props.setCustomSettings(paramsAndErrors);
      props.setValue({
        ...props.value(),
        customSettings: Object.fromEntries(
          filterOutCustomShaderParamErrors(paramsAndErrors).map((p) => {
            return [
              p.internalName,
              {
                count: p.quantity,
                type: p.type,
                data: p.defaultValue ?? new Array(p.quantity).fill(0),
              } as UniformData,
            ];
          })
        ),
      });
    },
    () => props.value().shaderCode
  );

  return (
    <Collapsible name="Custom Settings">
      {filterOutCustomShaderParamErrors(props.customSettings()).map((s) => {
        return (
          <CustomSetting
            value={() => props.value().customSettings}
            setValue={(v) =>
              props.setValue({
                ...props.value(),
                customSettings: v,
              })
            }
            setup={s}
            position={props.position}
          ></CustomSetting>
        );
      })}
    </Collapsible>
  );
}
