import { useEffect, useRef, useState } from "react";
import { RenderTask, RenderTaskOptions } from "../raymarcher/Render";
import { ProducerMainCanvas } from "./ProducerMainCanvas";

export function ProducerRoot() {
    const [renderSettings, setRenderSettings] = useState<RenderTaskOptions | undefined>();
    const renderSettingsRef = useRef(renderSettings);
    renderSettingsRef.current = renderSettings;
    
    const isProducer = (new URLSearchParams(window.location.search)).get("producer") !== null; 

    const joincode = (new URLSearchParams(window.location.search)).get("joincode");
    const server = (new URLSearchParams(window.location.search)).get("server"); 
    const renderStateRef = useRef<RenderTask | undefined>(undefined);
    // producer loop
    useEffect(() => {
        setInterval(async () => {
            if (!isProducer) return;
            if (renderSettingsRef.current) return;
        
            const queueDataReq = (await fetch(`${server}/dequeue-input/${joincode}`, {
                method: "POST",
                mode: "cors"
            }));
            if (!queueDataReq.ok) return;
            const queueDataJSON = await queueDataReq.json();
            setRenderSettings(queueDataJSON);
        }, 100);
    }, []);
    

    // UI
  return (
        <div className="App">
            <ProducerMainCanvas
            renderStateRef={renderStateRef}
            renderSettings={renderSettings}
            setRenderSettings={setRenderSettings}
            onImageComplete={async img => {    
                const imgloaded = await img;
                await fetch(`${server}/enqueue-output/${joincode}/0`, {
                    body: imgloaded,
                    mode: "cors",
                    method: "POST",
                    headers: {
                        "Content-Type": "image/png"
                    }
                });
            }}
            ></ProducerMainCanvas>
        </div>
    );
}