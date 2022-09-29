import { RenderTaskOptions } from "../raymarcher/Render";

export type KeysOfType<T, KT> = { [K in keyof T]: T[K] extends KT ? K : never }[keyof T]

export function NumberInput<T>(props: {
    key: KeysOfType<T, number>,
    getter: T
    setter: (t: T) => void
}) {
    return <input
        type="number"
        value={props.getter[props.key] as number}
        onInput={e => {
            props.setter({
                ...props.getter,
                [props.key]: Number(e.currentTarget.value)
            })
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
        {/* <NumberInput getter={props.renderSettings} setter={props.setRenderSettings} key=></NumberInput> */}
    </div>
}