import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { ConsumerMainCanvas } from './ConsumerMainCanvas'
import { RenderTaskOptions } from './raymarcher/Render'
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

    useEffect(() => {
        setInterval(async () => {
            if (!isProducer) return;
            //if (!renderSettings) return;
            const joincode = (new URLSearchParams(window.location.search)).get("joincode");
            const server = (new URLSearchParams(window.location.search)).get("server"); 
        
            const queueDataReq = (await fetch(`${server}/dequeue-input/${joincode}`, {
                method: "POST",
                mode: "cors"
            }));
            if (!queueDataReq.ok) return;
            const queueDataJSON = await queueDataReq.json();
            console.log(queueDataJSON);
            setRenderSettings(queueDataJSON);
        }, 1500);
    }, []);
    
    useEffect(() => {

        setInterval(async () => {
            if (isProducer) return;
            const settingsString = (JSON.stringify({ ...renderSettingsRef.current, canvas: undefined }));
            console.log(renderSettings, settingsString);
            await fetch(`${distRenderOptionsRef.current.server}/enqueue-input/${distRenderOptionsRef.current.joincode}/0`, {
                body: settingsString,
                mode: "cors",
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            console.log("enqueueing input...", distRenderOptionsRef.current);
        }, 1500);
    }, []);

  return (
    <div className="App">
        {isProducer
            ?
            <ProducerMainCanvas
            renderSettings={renderSettings}
            setRenderSettings={setRenderSettings}
            ></ProducerMainCanvas>
            :
            <ConsumerMainCanvas
                renderSettings={renderSettings}
                setRenderSettings={setRenderSettings}
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
