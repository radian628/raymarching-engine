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
        display: twgl.ProgramInfo,
        blit: twgl.ProgramInfo
    },
}

export type RenderTask = {
    dimensions: vec2,
    partitions: vec2,
    samples: number,
    samplesSoFar: number,

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

export type Result<T> = T & { isError?: false } | {
    message: string,
    isError: true
}

async function fetchText(url: string) {
    return (await fetch(url)).text();
}

export async function createRenderTask(options: RenderTaskOptions): Promise<Result<RenderTask>> {
    
    const gl = options.canvas.getContext("webgl2");
    if (!gl) {
        return {
            isError: true,
            message: "Failed to create WebGL2 canvas context."
        };
    }

    twgl.addExtensionsToContext(gl);

    const vertexBuffers = {
        vertex_position: { numComponents: 2, data: [
            -1, -1,
            1, -1,
            -1, 1,
            1, -1,
            -1, 1,
            1, 1
        ] }
    };

    const displayProgram = twgl.createProgramInfo(gl, [
        await fetchText("./shader/display.vert"),
        await fetchText("./shader/display.frag"),
    ]);

    const blitProgram = twgl.createProgramInfo(gl, [
        await fetchText("./shader/blit.vert"),
        await fetchText("./shader/blit.frag"),
    ]);

    const raymarchProgram = twgl.createProgramInfo(gl, [
        await fetchText("./shader/raymarcher.vert"),
        await fetchText("./shader/raymarcher.frag"),
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
        samplesSoFar: 0,

        glState: {
            canvas: options.canvas,
            gl,
            vao,
            shader: {
                raymarch: raymarchProgram,
                display: displayProgram,
                blit: blitProgram,
            },
            fb: {
                prev: twgl.createFramebufferInfo(gl, [{ format: gl.RGBA, internalFormat: gl.RGBA32F, mag: gl.NEAREST, target: gl.TEXTURE_2D }], ...options.dimensions),
                curr: twgl.createFramebufferInfo(gl, [{ format: gl.RGBA, internalFormat: gl.RGBA32F, mag: gl.NEAREST, target: gl.TEXTURE_2D }], ...options.dimensions),
            }
        },

        doRenderStep() {
            // draw to current
            gl.viewport(0, 0, ...this.dimensions);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.glState.fb.curr.framebuffer);
            gl.useProgram(this.glState.shader.raymarch.program);
            twgl.setUniforms(this.glState.shader.raymarch, {
                blendWithPreviousFactor: 1 - 1 / (this.samplesSoFar + 1),
                previousColor: this.glState.fb.prev.attachments[0],
                randNoise: [Math.random(), Math.random()]
            })
            twgl.setBuffersAndAttributes(gl, this.glState.shader.raymarch, bufferInfo);
            twgl.drawBufferInfo(gl, this.glState.vao);

            // copy to previous
            gl.useProgram(this.glState.shader.blit.program);
            twgl.setUniforms(this.glState.shader.blit, {
                inputImage: this.glState.fb.curr.attachments[0]
            });
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.glState.fb.prev.framebuffer);
            twgl.setBuffersAndAttributes(gl, this.glState.shader.raymarch, bufferInfo);
            twgl.drawBufferInfo(gl, this.glState.vao);

            this.samplesSoFar++;
            
        },

        displayProgressImage() {
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
            gl.useProgram(this.glState.shader.display.program);
            twgl.setUniforms(this.glState.shader.display, {
                inputImage: this.glState.fb.curr.attachments[0]
            });
            twgl.drawBufferInfo(gl, this.glState.vao);
        },

        isRenderDone() {
            return false;
        },

        isError: false
    } as RenderTask
}