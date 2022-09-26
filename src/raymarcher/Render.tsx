import * as twgl from "twgl.js";

type vec2 = [number, number]
type vec3 = [number, number, number]
type vec4 = [number, number, number, number]
type mat4 = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]
type mat3 = [number, number, number, number, number, number, number, number, number]

type RenderTaskGLState = {
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    fb: {
        prev: twgl.FramebufferInfo,
        curr: twgl.FramebufferInfo
    },
    vao: twgl.VertexArrayInfo,
    shader: {
        raymarch: twgl.ProgramInfo,
        display: twgl.ProgramInfo
    },
}

export type RenderTask = {
    dimensions: vec2,
    partitions: vec2,
    samples: number,

    position: vec3,
    rotation: mat3,

    doRenderStep: () => void,
    displayProgressImage: () => void,
    isRenderDone: () => boolean,

    glState: RenderTaskGLState
};

export type RenderTaskOptions = {
    position: vec3,
    rotation: mat3,
    dimensions: vec2,
    partitions: vec2,
    samples: number,
    canvas: HTMLCanvasElement,
}

export type Result<T> = T | {
    message: string,
    isError: true
}

async function fetchText(url: string) {
    return (await fetch(url)).text();
}

async function createRenderTask(options: RenderTaskOptions): Promise<Result<RenderTask>> {
    
    const gl = options.canvas.getContext("webgl2");
    if (!gl) {
        return {
            isError: true,
            message: "Failed to create WebGL2 canvas context."
        };
    }

    const vertexBuffers = {
        position: { numComponents: 2, data: [
            -1, -1,
            1, -1,
            -1, 1,
            1, -1,
            -1, 1,
            1, 1
        ] }
    };

    const displayProgram = twgl.createProgramInfo(gl, [
        await fetchText("./raymarcher/shader/display.vert"),
        await fetchText("./raymarcher/shader/display.frag"),
    ]);

    const raymarchProgram = twgl.createProgramInfo(gl, [
        await fetchText("./raymarcher/shader/raymarcher.vert"),
        await fetchText("./raymarcher/shader/raymarcher.frag"),
    ]);
    
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, vertexBuffers);
    const vao = twgl.createVertexArrayInfo(gl, raymarchProgram, bufferInfo);
    if (!vao) {
        return {
            isError: true,
            message: "Failed to create VAO"
        };
    }
    

    return {
        ...options,

        glState: {
            canvas: options.canvas,
            gl,
            vao,
            shader: {
                raymarch: raymarchProgram,
                display: displayProgram,
            },
            fb: {
                prev: twgl.createFramebufferInfo(gl, [{ format: gl.RGB32F, mag: gl.NEAREST }], ...options.dimensions),
                curr: twgl.createFramebufferInfo(gl, [{ format: gl.RGB32F, mag: gl.NEAREST }], ...options.dimensions),
            }
        },

        doRenderStep() {
            gl.useProgram(this.glState.shader.raymarch);
            twgl.drawBufferInfo(gl, this.glState.vao);
        },

        displayProgressImage() {

        },

        isRenderDone() {
            return false;
        }
    } as RenderTask
}