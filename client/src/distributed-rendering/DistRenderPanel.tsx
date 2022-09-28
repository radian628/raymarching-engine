import { DistRenderConsumer } from "./DistRenderConsumer";
import { DistRenderProducer } from "./DistRenderProducer";

export function DistRenderPanel() {
    const isProducer = (new URLSearchParams(window.location.search)).get("producer") !== null; 

    if (isProducer) {

    }

    return <div>
        {isProducer ? 
        undefined
        :
        <DistRenderConsumer
            onReceiveImage={img => {
                
            }}
        ></DistRenderConsumer>
        }
    </div>
}