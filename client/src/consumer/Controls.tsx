import { useEffect, useState } from "react";
import { RenderTaskOptions } from "../raymarcher/Render";

export type KeysOfType<T, KT> = { [K in keyof T]: T[K] extends KT ? K : never }[keyof T]

export function NumberInput<T>(props: {
    k: KeysOfType<T, number>,
    getter: T
    setter: (t: T) => void,
    requiresBlurToUpdate?: boolean,
    sensitivity?: number
}) {
    const [editableState, setEditableState] = useState(props.getter[props.k] as number);

    function setState(val: string) {
        props.setter({
            ...props.getter,
            [props.k]: Number(val)
        });
    }

    useEffect(() => {
        if (!props.requiresBlurToUpdate && editableState != props.getter[props.k]) {
            setState(editableState.toString());    
        }
    });

    return <input
        onMouseDown={e => {
            e.currentTarget.requestPointerLock();
        }}
        onMouseUp={e => {
            document.exitPointerLock();
        }}
        onMouseMove={e => {
            if (document.pointerLockElement === e.currentTarget) {
                setEditableState(editableState + e.movementX * (props.sensitivity ?? 1));
            }
        }}
        onBlur={e => {
            if (props.requiresBlurToUpdate) setState(e.currentTarget.value);
        }}
        type="number"
        value={editableState.toPrecision(14).replace(/0+$/g, "").replace(/\.$/g, ".0")}
        onChange={e => {
            setEditableState(Number(e.currentTarget.value));
        }}
    ></input>
}

export function Controls(props: {
    renderSettings: RenderTaskOptions | undefined,
    setRenderSettings: (s: RenderTaskOptions) => void
}) {
    if (!props.renderSettings) {
        return <p>Loading...</p>;
    }
    const renderSettings = props.renderSettings;
    return <div>
        <label>Width</label>
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
        ></input>
        <NumberInput sensitivity={0.001} getter={props.renderSettings} setter={props.setRenderSettings} k="dofAmount"></NumberInput>
        <NumberInput sensitivity={0.01} getter={props.renderSettings} setter={props.setRenderSettings} k="reflections"></NumberInput>
        <NumberInput sensitivity={0.04} getter={props.renderSettings} setter={props.setRenderSettings} k="raymarchingSteps"></NumberInput>
    </div>
}