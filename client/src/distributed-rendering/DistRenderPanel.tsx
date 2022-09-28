import { DistRenderConsumer } from "./DistRenderConsumer";
import { DistRenderProducer } from "./DistRenderProducer";

export function DistRenderPanel() {
    return <div>
        <DistRenderProducer></DistRenderProducer>
        <DistRenderConsumer></DistRenderConsumer>
    </div>
}