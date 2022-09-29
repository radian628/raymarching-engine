import { DistRenderConsumer, DistRenderConsumerState } from "./DistRenderConsumer";
import { ConsumerMainCanvas } from "./ConsumerMainCanvas";
import { useEffect, useRef, useState } from "react";
import { RenderTask, RenderTaskOptions } from "../raymarcher/Render";
import { Controls } from "./Controls";

export function ConsumerRoot() {
    const [renderSettings, setRenderSettings] = useState<RenderTaskOptions | undefined>();
    const renderSettingsRef = useRef(renderSettings);
    renderSettingsRef.current = renderSettings;

    const [distRenderOptions, setDistRenderOptions] = useState<DistRenderConsumerState>({
        server: "",
        secret: "",
        joincode: ""
    });
    const distRenderOptionsRef = useRef(distRenderOptions);
    distRenderOptionsRef.current = distRenderOptions;
    const renderStateRef = useRef<RenderTask | undefined>(undefined);

    // consumer loop
    useEffect(() => {
        setInterval(async () => {
            if (!renderSettingsRef.current || !distRenderOptionsRef.current.server) return;

            const queueLengthStr = await (await fetch(`${distRenderOptionsRef.current.server
            }/input-queue-length/${distRenderOptionsRef.current.joincode}`, {
                method: "POST",
                mode: "cors"
            })).text();
            const queueLength = Number(queueLengthStr);
            console.log(queueLengthStr, queueLength);

            if (queueLength < 4) {
                const settingsString = (JSON.stringify({ ...renderSettingsRef.current, rotation: Array.from(renderSettingsRef.current.rotation), canvas: undefined }));
                console.log("\n\n trying to enqueue input...")
                await fetch(`${distRenderOptionsRef.current.server}/enqueue-input/${distRenderOptionsRef.current.joincode}/0`, {
                    body: settingsString,
                    mode: "cors",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
                console.log("successfully enqueued input!!!!!");
            } else {
                console.log("Queue is too long--- not enqueueing input.");
            }

            if (!renderStateRef.current) return;
            let blob = await (await fetch(`${distRenderOptionsRef.current.server}/dequeue-output/${distRenderOptionsRef.current.joincode}`, {
                body: distRenderOptionsRef.current.secret,
                mode: "cors",
                method: "POST",
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "text/plain"
                }
            })).blob();

            if (blob.type == "image/png") {
                const url = URL.createObjectURL(blob);
                await renderStateRef.current.merge(url, 100);
                renderStateRef.current.displayProgressImage();
                URL.revokeObjectURL(url);
            }

            console.log(blob);
        }, 100);
    }, []);

    // UI
  return (
    <div>
        <ConsumerMainCanvas
            renderSettings={renderSettings}
            setRenderSettings={setRenderSettings}
            renderStateRef={renderStateRef}
        ></ConsumerMainCanvas>
        <Controls
            renderSettings={renderSettings}
            setRenderSettings={setRenderSettings}
        ></Controls>
        <DistRenderConsumer
            onReceiveImage={img => {}}
            consumerState={distRenderOptions}
            setConsumerState={setDistRenderOptions}
        ></DistRenderConsumer>
    </div>
  )
}