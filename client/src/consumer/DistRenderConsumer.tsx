import { useState } from "react";
import { useInterval } from "../Util";

export type DistRenderConsumerState = {
    joincode: string,
    server: string,
    secret: string
}

function setProp<T extends {}, K extends keyof T>(obj: T, prop: K, value: T[K]) {
    return {
        ...obj,
        [prop]: value
    };
}

export function DistRenderConsumer(props: {
    onReceiveImage: (img: HTMLImageElement) => void,
    consumerState: DistRenderConsumerState,
    setConsumerState: (s: DistRenderConsumerState) => void
}) {

    const [editableConsumerState, setEditableConsumerState] = useState({
        joincode: "",
        server: ""
    });

    useInterval(async () => {
        if (props.consumerState.secret != "") {
            // const imgRes = (await fetch(`${props.consumerState.server}/dequeue-output/${props.consumerState.joincode}`, {
            //     method: "POST",
            //     mode: "cors"
            // }));
            // if (!imgRes.ok) {
            //     console.log("nothing in queue");
            //     return;
            // }
            // const imgBlob = await imgRes.blob();
            // const img = new Image();
            // img.src = URL.createObjectURL(imgBlob);
            // props.onReceiveImage(img);
        }
    }, 100);

    const producerLink = `${window.location.origin}?producer&joincode=${
        encodeURIComponent(props.consumerState.joincode)
    }&server=${encodeURIComponent(props.consumerState.server)}`;

    return <div>
        <p>Current join code: {props.consumerState.joincode}</p>
        <p>Current distributed rendering server: <a href={props.consumerState.server}>{props.consumerState.server}</a></p>
        <p>Producer Link: <a href={producerLink}>{props.consumerState.server ? producerLink : "none"}</a></p>
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

                props.setConsumerState({
                    ...editableConsumerState,
                    secret
                });
            }}
        >Join</button>
    </div>
}
