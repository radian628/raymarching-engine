import { useEffect, useState } from "react";
import { RenderTaskOptions } from "../raymarcher/Render";
import { OtherSettings } from "./ConsumerRoot";

export type KeysOfType<T, KT> = { [K in keyof T]: T[K] extends KT ? K : never }[keyof T]

export function NumberObjPropInput<T>(props: {
    k: KeysOfType<T, number>,
    getter: T
    setter: (t: T) => void,
    delayedUpdate?: boolean,
    sensitivity?: number,
    log?: boolean
}) {
    return <NumberInput
        {...props}
        getter={props.getter[props.k] as number}
        setter={n => {
            props.setter({
                ...props.getter,
                [props.k]: n
            });
        }}
    ></NumberInput>
}

export function NumberInput(props: {
    getter: number
    setter: (t: number) => void,
    delayedUpdate?: boolean,
    sensitivity?: number,
    log?: boolean
}) {
    const [editableState, setEditableState] = useState(props.getter);
    const [oldState, setOldState] = useState(props.getter);
    if (props.getter != oldState) {
        setOldState(props.getter);
        setEditableState(props.getter);
    }

    function setState(val: string) {
        props.setter(Number(val));
    }

    useEffect(() => {
        if (!props.delayedUpdate && editableState != props.getter) {
            setState(editableState.toString());    
        }
    });

    return <input
        onMouseDown={e => {
            e.currentTarget.requestPointerLock();
        }}
        onMouseUp={e => {
            document.exitPointerLock();
            setState(editableState.toString());    
        }}
        onMouseMove={e => {
            if (document.pointerLockElement === e.currentTarget) {
                if (props.log) {
                    setEditableState(editableState * (1 + e.movementX * (props.sensitivity ?? 0.1)))
                } else {
                    setEditableState(editableState + e.movementX * (props.sensitivity ?? 1));
                }
            }
        }}
        onBlur={e => {
            if (props.delayedUpdate) setState(e.currentTarget.value);
        }}
        type="number"
        value={editableState.toPrecision(14).replace(/0+$/g, "").replace(/\.$/g, "")}
        onChange={e => {
            setEditableState(Number(e.currentTarget.value));
        }}
    ></input>
}

export function BooleanInput(props: {
    getter: boolean,
    setter: (b: boolean) => void
}) {
    return <input
        type="checkbox"
        checked={props.getter}
        onChange={e => {
            props.setter(e.currentTarget.checked);
        }}
    ></input>
}

export function Controls(props: {
    renderSettings: RenderTaskOptions | undefined,
    setRenderSettings: (s: RenderTaskOptions) => void,
    otherSettings: OtherSettings,
    setOtherSettings: (o: OtherSettings) => void
}) {
    if (!props.renderSettings) {
        return <p>Loading...</p>;
    }
    const renderSettings = props.renderSettings;
    console.log("rendersettings in controls", renderSettings?.dimensions);
    return <div>
        {/* <label>Width</label>
        <input
            type="number"
            value={props.renderSettings.dimensions[0]}
            onInput={e => {
                props.setRenderSettings({
                    ...renderSettings,
                    dimensions: [Number(e.currentTarget.value), renderSettings.dimensions[1]]
                });
            }}
        ></input>
        <label>Height</label>
        <input
            type="number"
            value={props.renderSettings.dimensions[1]}
            onInput={e => {
                props.setRenderSettings({
                    ...renderSettings,
                    dimensions: [renderSettings.dimensions[0], Number(e.currentTarget.value)]
                });
            }}
        ></input> */}
        <div>
            <button
                onClick={() => {
                    const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;
                    canvas.toBlob(blob => {
                        if (!blob) {
                            window.alert("Failed to copy to clipboard.");
                            return;
                        }
                        if (window.ClipboardItem !== undefined) {
                            navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                        } else {
                            window.alert("Your browser does not support clipboard images.")
                        }
                    }, "image/png")
                }}
            >Copy Image to Clipboard</button>
            <button
                onClick={() => {
                    const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;
                    canvas.toBlob(blob => {
                        if (!blob) {
                            window.alert("Failed to create image.");
                            return;
                        }
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = "3d-fractal.png";
                        document.body.appendChild(link);
                        link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
                        document.body.removeChild(link);
                        console.log(link.href);
                        //URL.revokeObjectURL(link.href);
                    }, "image/png")
                }}
            >Download Image</button>
        </div>
        <div>
            <label>Rescale Image to Screen</label>
            <BooleanInput
                getter={props.otherSettings.fitCanvasToScreen}
                setter={e => {
                    props.setOtherSettings({
                        ...props.otherSettings, fitCanvasToScreen: e
                    })
                }}
            ></BooleanInput>
        </div>
        <div>
            <label>Automatically set pixel dimensions to screen size</label>
            <BooleanInput
                getter={props.otherSettings.autoRescaleCanvas}
                setter={e => {
                    props.setOtherSettings({
                        ...props.otherSettings, autoRescaleCanvas: e
                    })
                }}
            ></BooleanInput>
        </div>
        <div>
            <label>Screen Dimensions</label>
            <NumberInput
                getter={props.renderSettings.dimensions[0]}
                setter={e => {
                    props.setRenderSettings({
                        ...renderSettings,
                        dimensions: [e, renderSettings.dimensions[1]]
                    });
                }}
                delayedUpdate={true}
            ></NumberInput>
            <NumberInput
                getter={props.renderSettings.dimensions[1]}
                setter={e => {
                    props.setRenderSettings({
                        ...renderSettings,
                        dimensions: [renderSettings.dimensions[0], e]
                    });
                }}
                delayedUpdate={true}
            ></NumberInput>
        </div>
        <div>
        <label>DoF Strength</label>
        <NumberObjPropInput log={true} sensitivity={0.001} getter={props.renderSettings} setter={props.setRenderSettings} k="dofAmount"></NumberObjPropInput>
        </div>
        <div>
        <label>DoF Distance</label>
        <NumberObjPropInput log={true} sensitivity={0.001} getter={props.renderSettings} setter={props.setRenderSettings} k="dofFocalPlaneDistance"></NumberObjPropInput>
        </div>
        <div>
        <label>Reflections</label>
        <NumberObjPropInput sensitivity={0.01} getter={props.renderSettings} setter={props.setRenderSettings} k="reflections"></NumberObjPropInput>
        </div>
        <div>
        <label>Raymarching Steps</label>
        <NumberObjPropInput sensitivity={0.04} getter={props.renderSettings} setter={props.setRenderSettings} k="raymarchingSteps"></NumberObjPropInput>
        </div>
        <div>
        <label>Indirect Lighting Raymarching Steps</label>
        <NumberObjPropInput sensitivity={0.04} getter={props.renderSettings} setter={props.setRenderSettings} k="indirectLightingRaymarchingSteps"></NumberObjPropInput>
        </div>
        <div>
        <label>Fog Density</label>
        <NumberObjPropInput log={true} sensitivity={0.001} getter={props.renderSettings} setter={props.setRenderSettings} k="fogDensity"></NumberObjPropInput>
        </div>
    </div>
}