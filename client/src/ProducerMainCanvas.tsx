import { createRef, SetStateAction, useEffect, useRef } from "react";
import { RenderTask, RenderTaskOptions, createRenderTask } from "./raymarcher/Render";

export function ProducerMainCanvas(props: {
    renderSettings: RenderTaskOptions | undefined,
    setRenderSettings: React.Dispatch<SetStateAction<RenderTaskOptions | undefined>>
}) {
    const canvasRef = createRef<HTMLCanvasElement>();

    const renderStateRef = useRef<RenderTask | undefined>(undefined);

    const animFrameRef = useRef<number | undefined>();

    const animate = () => {
        if (renderStateRef.current) {
            renderStateRef.current.doRenderStep();
            renderStateRef.current.displayProgressImage();
        }
        animFrameRef.current = requestAnimationFrame(animate);
    }
    
    useEffect(() => {
        animFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameRef.current as number);
    }, []);

    useEffect(() => {
        const elem = canvasRef.current;
        if (!elem) return;
        if (!props.renderSettings) return;
        (async () => {
            // if (renderStateRef.current) {
            //     renderStateRef.current.displayRawProgressImage();
            // }
            //@ts-ignore
            const maybeRenderTask = await createRenderTask({
                ...props.renderSettings,
                rotation: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
                canvas: elem
            });
            console.log(maybeRenderTask);
            if (maybeRenderTask.isError) return;
            renderStateRef.current = maybeRenderTask;
        })()
    }, [props.renderSettings]);
    
    return <canvas
        width={props.renderSettings?.dimensions[0] ?? 512}
        height={props.renderSettings?.dimensions[1] ?? 512}
        ref={canvasRef}
    ></canvas>
}