import { DistRenderConsumer, DistRenderConsumerState } from "./DistRenderConsumer";
import { ConsumerMainCanvas } from "./ConsumerMainCanvas";
import { useEffect, useRef, useState } from "react";
import { RenderTask, RenderTaskOptions } from "../raymarcher/Render";

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

    const isProducer = (new URLSearchParams(window.location.search)).get("producer") !== null; 

    const joincode = (new URLSearchParams(window.location.search)).get("joincode");
    const server = (new URLSearchParams(window.location.search)).get("server"); 
    const renderStateRef = useRef<RenderTask | undefined>(undefined);

    // consumer loop
    useEffect(() => {
        setInterval(async () => {
            if (isProducer) return;
            if (!renderSettingsRef.current || !distRenderOptionsRef.current.server) return;
            const settingsString = (JSON.stringify({ ...renderSettingsRef.current, rotation: Array.from(renderSettingsRef.current.rotation), canvas: undefined }));
            await fetch(`${distRenderOptionsRef.current.server}/enqueue-input/${distRenderOptionsRef.current.joincode}/0`, {
                body: settingsString,
                mode: "cors",
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });

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
                const img = new Image();
                //img.src = URL.createObjectURL(blob);
                await renderStateRef.current.merge(URL.createObjectURL(blob), 10);
                //URL.revokeObjectURL(img.src);
            }

            console.log(blob);
        }, 1500);
    }, []);

    // UI
  return (
    <div>
        <ConsumerMainCanvas
            renderSettings={renderSettings}
            setRenderSettings={setRenderSettings}
            renderStateRef={renderStateRef}
        ></ConsumerMainCanvas>
        <DistRenderConsumer
            onReceiveImage={img => {}}
            consumerState={distRenderOptions}
            setConsumerState={setDistRenderOptions}
        ></DistRenderConsumer>
    </div>
  )
}