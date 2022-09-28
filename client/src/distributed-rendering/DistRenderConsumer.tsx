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
        joincode: ""
    });

    const [consumerState, setConsumerState] = useState({
        joincode: ""
    });

    return <div>
        <p>Current join code: {editableConsumerState.joincode}</p>
        <input
            value={editableConsumerState.joincode}
            type="text"
            onInput={e => setEditableConsumerState({
                ...editableConsumerState,
                joincode: e.currentTarget.value
            })}
        ></input>
        <button
            onClick={async _ => {
                
            }}
        >Join</button>
    </div>
}
