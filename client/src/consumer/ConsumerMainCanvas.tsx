import React, { createRef, SetStateAction, useEffect, useMemo, useRef, useState } from "react"
import { m4, v3 } from "twgl.js";
import { createRenderTask, RenderTask, RenderTaskOptions, vec3 } from "../raymarcher/Render"

const keysDown = new Map<string, boolean>();
document.addEventListener("keydown", e => {
    keysDown.set(e.key.toUpperCase(), true);
});
document.addEventListener("keyup", e => {
    keysDown.set(e.key.toUpperCase(), false);
});

function noUndefined<T extends {}>(obj: T): { [K in keyof T]: Exclude<T[K], undefined> } {
    //@ts-ignore
    return Object.fromEntries(Object.entries(obj).filter(([k, v]) => v !== undefined));
} 


export function ConsumerMainCanvas(props: {
    renderSettings: RenderTaskOptions | undefined,
    setRenderSettings: React.Dispatch<SetStateAction<RenderTaskOptions | undefined>>,
    renderStateRef: React.MutableRefObject<RenderTask | undefined>
} & React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement>) {
    
    const canvasRef = createRef<HTMLCanvasElement>();

    const pointerLockRef = useRef<boolean>(false);

    const mouseDeltas = useRef<[number, number]>([0, 0]);

    const animFrameRef = useRef<number | undefined>();

    // controls loop
    const animate = () => {
        if (props.renderStateRef.current) {
            props.renderStateRef.current.doRenderStep();
            props.renderStateRef.current.displayProgressImage();

            if (pointerLockRef.current) {
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
        }
        animFrameRef.current = requestAnimationFrame(animate);
    }

    // init controls loop
    useEffect(() => {
        animFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameRef.current as number);
    }, []);

    // create render tasks when render settings ever changes
    useEffect(() => {
        const elem = canvasRef.current;
        if (!elem) return;
        if (!props.renderSettings) return;
        (async () => {
            //@ts-ignore
            const maybeRenderTask = await createRenderTask(props.renderSettings);
            if (maybeRenderTask.isError) return;
            props.renderStateRef.current = maybeRenderTask;
        })()
    }, [props.renderSettings]);

    // init render settings at the beginning to its initial values
    useEffect(() => {
        const elem = canvasRef.current;
        if (!elem) return;

        if (!props.renderSettings) {
            props.setRenderSettings({
                position: [0, 0,0],
                rotation: m4.identity(),
                dimensions: [256, 256],
                partitions: [1, 1],
                samples: 100,
                canvas: elem,

                dofAmount: 0.01,
                dofFocalPlaneDistance: 3,

                cameraMode: 0,
                fov: 90,

                reflections: 3,
                raymarchingSteps: 32,
                indirectLightingRaymarchingSteps: 16,

                fogDensity: 0.1
            });
        }
    });

    // pointer lock
    useEffect(() => {
        const elem = canvasRef.current;
        if (!elem) return;
        function clickListener() {
            elem?.requestPointerLock();
        }

        document.addEventListener("pointerlockchange", e => {
            pointerLockRef.current = document.pointerLockElement === elem;
        })

        elem.addEventListener("click", clickListener);

        return () => {
            elem.removeEventListener("click", clickListener);
        }
    })


    return <canvas
        {...noUndefined({ ...props, renderSettings: undefined, setRenderSettings: undefined, renderStateRef: undefined })}
        id="main-canvas"
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
