import { createRef, SetStateAction, useEffect, useMemo, useRef, useState } from "react"
import { m4, v3 } from "twgl.js";
import { createRenderTask, RenderTask, RenderTaskOptions, vec3 } from "./raymarcher/Render"

const keysDown = new Map<string, boolean>();
document.addEventListener("keydown", e => {
    keysDown.set(e.key.toUpperCase(), true);
});
document.addEventListener("keyup", e => {
    keysDown.set(e.key.toUpperCase(), false);
});

export function ConsumerMainCanvas(props: {
    renderSettings: RenderTaskOptions | undefined,
    setRenderSettings: React.Dispatch<SetStateAction<RenderTaskOptions | undefined>>
}) {
    
    const canvasRef = createRef<HTMLCanvasElement>();

    const renderStateRef = useRef<RenderTask | undefined>(undefined);

    //const [renderSettings, setRenderSettings] = useState<RenderTaskOptions | undefined>();

    const mouseDeltas = useRef<[number, number]>([0, 0]);

    const animFrameRef = useRef<number | undefined>();

    const animate = () => {
        if (renderStateRef.current) {
            renderStateRef.current.doRenderStep();
            renderStateRef.current.displayProgressImage();

            let translation = [0, 0, 0]
            if (keysDown.get("W")) translation[2] += 0.1;
            if (keysDown.get("S")) translation[2] -= 0.1;
            if (keysDown.get("D")) translation[0] += 0.1;
            if (keysDown.get("A")) translation[0] -= 0.1;
            if (keysDown.get(" ")) translation[1] += 0.1;
            if (keysDown.get("SHIFT")) translation[1] -= 0.1;
            if (translation[0] != 0 || translation[1] != 0 || translation[2] != 0 || mouseDeltas.current[0] != 0 || mouseDeltas.current[1] != 0) {
                const mouseDeltasCopy = [mouseDeltas.current[0], mouseDeltas.current[1]];
                props.setRenderSettings(renderSettingsOld => {
                    mouseDeltas.current[0] = 0;
                    mouseDeltas.current[1] = 0;
                    let translation2: v3.Vec3 | undefined;
                    if (renderSettingsOld) translation2 = m4.transformDirection(renderSettingsOld.rotation, translation);
                    return (renderSettingsOld && translation2) ? {
                    ...renderSettingsOld,
                    position: [
                        renderSettingsOld.position[0] + translation2[0], 
                        renderSettingsOld.position[1] + translation2[1], 
                        renderSettingsOld.position[2] + translation2[2]
                    ],
                    rotation: m4.rotateY(m4.rotateX(
                        renderSettingsOld.rotation,
                        mouseDeltasCopy[1] * 0.004
                    ),
                    mouseDeltasCopy[0] * 0.004)
                } : undefined});
            }
        }
        animFrameRef.current = requestAnimationFrame(animate);
    }

    useEffect(() => {
        const elem = canvasRef.current;
        if (!elem) return;
        if (!props.renderSettings) return;
        (async () => {
            //@ts-ignore
            const maybeRenderTask = await createRenderTask(props.renderSettings);
            if (maybeRenderTask.isError) return;
            renderStateRef.current = maybeRenderTask;
        })()
    }, [props.renderSettings]);

    useEffect(() => {
        animFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameRef.current as number);
    }, []);

    useEffect(() => {
        const elem = canvasRef.current;
        if (!elem) return;

        //console.log("rendersettings: ", renderSettings);
        if (!props.renderSettings) {
            props.setRenderSettings({
                position: [0, 0,0],
                rotation: m4.identity(),
                dimensions: [512, 512],
                partitions: [1, 1],
                samples: 1,
                canvas: elem
            });
        }
    });

    useEffect(() => {
        const elem = canvasRef.current;
        if (!elem) return;
        // function mouseMoveListener(e: MouseEvent) {
        //     if (document.pointerLockElement === elem) {
        //         mouseDeltas.current = [mouseDeltas.current[0] + e.movementX, mouseDeltas.current[1] + e.movementY];
        //     }
        // }

        function clickListener() {
            elem?.requestPointerLock();
        }

        //elem.addEventListener("mousemove", mouseMoveListener);
        elem.addEventListener("click", clickListener);

        return () => {
            //elem.removeEventListener("mousemove", mouseMoveListener);
            elem.removeEventListener("click", clickListener);
        }
    })


    return <canvas
        width={props.renderSettings?.dimensions[0] ?? 512}
        height={props.renderSettings?.dimensions[1] ?? 512}
        ref={canvasRef}
        onMouseMove={e => {
            if (document.pointerLockElement === e.currentTarget) {
                mouseDeltas.current[0] += e.movementX;
                mouseDeltas.current[1] += e.movementY;
            }
        }}
    ></canvas>
}