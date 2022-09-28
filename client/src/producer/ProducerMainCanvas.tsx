import { createRef, SetStateAction, useEffect, useRef } from "react";
import { RenderTask, RenderTaskOptions, createRenderTask } from "../raymarcher/Render";

export function ProducerMainCanvas(props: {
    renderSettings: RenderTaskOptions | undefined,
    setRenderSettings: React.Dispatch<SetStateAction<RenderTaskOptions | undefined>>,
    onImageComplete: (img: Promise<Blob>) => void,
    renderStateRef: React.MutableRefObject<RenderTask | undefined>
}) {
    const canvasRef = createRef<HTMLCanvasElement>();

    const animFrameRef = useRef<number | undefined>();

    const animate = () => {
        if (props.renderStateRef.current) {
            if (props.renderStateRef.current.isRenderDone()) {
                console.log("renderfinished2")
                props.onImageComplete(props.renderStateRef.current.getFinalImage());
                props.setRenderSettings(undefined);
                props.renderStateRef.current = undefined;
            } else {
                props.renderStateRef.current.doRenderStep();
                props.renderStateRef.current.displayProgressImage();
            }
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
            //@ts-ignore
            const maybeRenderTask = await createRenderTask({
                ...props.renderSettings,
                canvas: elem
            });
            if (maybeRenderTask.isError) return;
            props.renderStateRef.current = maybeRenderTask;
        })()
    }, [props.renderSettings]);
    
    return <canvas
        width={props.renderSettings?.dimensions[0] ?? 512}
        height={props.renderSettings?.dimensions[1] ?? 512}
        ref={canvasRef}
    ></canvas>
}