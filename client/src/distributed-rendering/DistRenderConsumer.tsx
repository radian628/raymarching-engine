import { useState } from "react";

export type DistRenderConsumerState = {
    joincode: string
}

function setProp<T extends {}, K extends keyof T>(obj: T, prop: K, value: T[K]) {
    return {
        ...obj,
        [prop]: value
    };
}

export function DistRenderConsumer() {

    const [editableConsumerState, setEditableConsumerState] = useState({
        joincode: "",
        server: ""
    });

    const [consumerState, setConsumerState] = useState({
        joincode: "",
        server: "",
        secret: ""
    });

    return <div>
        <p>Current join code: {consumerState.joincode}</p>
        <p>Current distributed rendering server: <a href={consumerState.server}>{consumerState.server}</a></p>
        <label>Join Code</label>
        <input
            value={editableConsumerState.joincode}
            type="text"
            onInput={e => setEditableConsumerState({
                ...editableConsumerState,
                joincode: e.currentTarget.value
            })}
        ></input>
        <label>Server URL</label>
        <input
            value={editableConsumerState.server}
            type="text"
            onInput={e => setEditableConsumerState({
                ...editableConsumerState,
                server: e.currentTarget.value
            })}
        ></input>
        <button
            onClick={async _ => {
                const secret = await (await fetch(
                    `${editableConsumerState.server}/create-render-group/${editableConsumerState.joincode}`,
                    {
                        method: "POST",
                        mode: "cors"
                    }
                )).text();

                setConsumerState({
                    ...editableConsumerState,
                    secret
                });
            }}
        >Join</button>
    </div>
}
