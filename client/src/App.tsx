import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { ConsumerMainCanvas } from './ConsumerMainCanvas'
import { RenderTask, RenderTaskOptions } from './raymarcher/Render'
import { DistRenderConsumer, DistRenderConsumerState } from './distributed-rendering/DistRenderConsumer'
import { useInterval } from './Util'
import { ProducerMainCanvas } from './ProducerMainCanvas'
import { render } from 'react-dom'

function App() {
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
        }, 1500);
    }, []);
    
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
                    "Content-Type": "text/plain"
                }
            })).blob();

            if (blob.type == "image/png") {
                const img = new Image();
                //img.src = URL.createObjectURL(blob);
                await renderStateRef.current.merge(URL.createObjectURL(blob), 100);
                //URL.revokeObjectURL(img.src);
            }

            console.log(blob);
        }, 1500);
    }, []);

    // UI
  return (
    <div className="App">
        {isProducer
            ?
            <ProducerMainCanvas
            renderStateRef={renderStateRef}
            renderSettings={renderSettings}
            setRenderSettings={setRenderSettings}
            onImageComplete={async img => {    
                console.log("Render finished!")
                const imgloaded = await img;
                console.log("loaded blob", imgloaded);
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
            :
            <ConsumerMainCanvas
                renderSettings={renderSettings}
                setRenderSettings={setRenderSettings}
                renderStateRef={renderStateRef}
            ></ConsumerMainCanvas>
        }
        {isProducer ? undefined : <DistRenderConsumer
            onReceiveImage={img => {}}
            consumerState={distRenderOptions}
            setConsumerState={setDistRenderOptions}
        ></DistRenderConsumer>}
    </div>
  )
}

export default App
