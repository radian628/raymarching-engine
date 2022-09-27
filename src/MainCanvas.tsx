import { createRef, useEffect, useState } from "react"
import { createRenderTask } from "./raymarcher/Render"

export function MainCanvas() {
    const canvasRef = createRef<HTMLCanvasElement>();

    let renderTaskCreated = false;

    useEffect(() => {
        (async () => {
            if (renderTaskCreated) return;
            renderTaskCreated = (true);
            const elem = canvasRef.current;
            if (!elem) return;
    
            const renderState = await createRenderTask({
                dimensions: [512, 512],
                position: [0.5, 0.5, 0.5],
                rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
                partitions: [4, 4],
                samples: 1,
                canvas: elem
            });

            if (renderState.isError) return;
            let drawLoop = () => {
                for (let i = 0; i < 5; i++) {
                    renderState.doRenderStep();
                }
                renderState.displayProgressImage();
                requestAnimationFrame(drawLoop);
                console.log(renderState.samplesSoFar);
            };
            drawLoop();

        })();
    });

    return <canvas
        width={512}
        height={512}
        ref={canvasRef}
    ></canvas>
}
