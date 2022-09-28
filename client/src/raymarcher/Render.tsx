import * as twgl from "twgl.js";
import { m4 } from "twgl.js";

export type vec2 = [number, number]
export type vec3 = [number, number, number]
export type vec4 = [number, number, number, number]
//export type mat4 = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]
//export type mat3 = [number, number, number, number, number, number, number, number, number]

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
        blit: twgl.ProgramInfo,
        merge: twgl.ProgramInfo
    },
}

export type RenderTask = {
    dimensions: vec2,
    partitions: vec2,
    samples: number,
    samplesSoFar: number,

    position: vec3,
    rotation: m4.Mat4,

    doRenderStep: () => void,
    displayProgressImage: () => void,
    displayRawProgressImage: () => void,
    isRenderDone: () => boolean,
    getFinalImage: () => Promise<Blob>,
    merge: (url: string, samples: number) => Promise<void>,

    glState: RenderTaskGLState
};

export type RenderTaskOptions = {
    position: vec3,
    rotation: m4.Mat4,
    dimensions: vec2,
    partitions: vec2,
    samples: number,
    canvas: HTMLCanvasElement,
}

export type SerializableRenderTaskOptions = {
    position: vec3,
    rotation: [
        number, number, number, number, 
        number, number, number, number, 
        number, number, number, number, 
        number, number, number, number
    ],
    dimensions: vec2,
    partitions: vec2,
    samples: number
};

export type Result<T> = T & { isError?: false } | {
    message: string,
    isError: true
}

const fetchCache = new Map<string, string>();
async function fetchText(url: string) {
    if (fetchCache.has(url)) {
        return fetchCache.get(url) as string;
    } else {
        const text = await (await fetch(url)).text();
        fetchCache.set(url, text);
        return text;
    }
}

const programInfoCache = new Map<string, twgl.ProgramInfo>();
function memoizedCreateProgramInfo(gl: WebGL2RenderingContext, sources: [string, string]) {
    const key = sources.join("$");
    if (programInfoCache.has(key)) {
        return programInfoCache.get(key) as twgl.ProgramInfo;
    } else {
        let prog = twgl.createProgramInfo(gl, sources);
        programInfoCache.set(key, prog);
        return prog;
    }
}

function makeMemoizedFramebufferGetter() {
    let memoizedFB: twgl.FramebufferInfo | undefined;
    let lastX = 0;
    let lastY = 0;
    let lastGL: WebGL2RenderingContext | undefined;
    return function (gl: WebGL2RenderingContext, x: number, y: number) {
        if (!memoizedFB || lastX != x || lastY != y || gl !== lastGL) {
            console.log("bad cache");
            lastX = x;
            lastY = y;
            lastGL = gl;
            memoizedFB = twgl.createFramebufferInfo(gl, [{ format: gl.RGBA, internalFormat: gl.RGBA32F, mag: gl.NEAREST, target: gl.TEXTURE_2D }], x, y);
            return memoizedFB as twgl.FramebufferInfo;
        } else {
            return memoizedFB;
        }
    }
}

const getCurrentFramebuffer = makeMemoizedFramebufferGetter();
const getPrevFramebuffer = makeMemoizedFramebufferGetter();

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

    const displayProgram = memoizedCreateProgramInfo(gl, [
        await fetchText("./shader/display.vert"),
        await fetchText("./shader/display.frag"),
    ]);

    const blitProgram = memoizedCreateProgramInfo(gl, [
        await fetchText("./shader/blit.vert"),
        await fetchText("./shader/blit.frag"),
    ]);

    const raymarchProgram = memoizedCreateProgramInfo(gl, [
        await fetchText("./shader/raymarcher.vert"),
        await fetchText("./shader/raymarcher.frag"),
    ]);

    const mergeProgram = memoizedCreateProgramInfo(gl, [
        await fetchText("./shader/merge.vert"),
        await fetchText("./shader/merge.frag"),
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
                merge: mergeProgram
            },
            fb: {
                prev: getPrevFramebuffer(gl, ...options.dimensions),
                curr: getCurrentFramebuffer(gl, ...options.dimensions),
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
                randNoise: [Math.random(), Math.random()],
                position: this.position,
                rotation: this.rotation
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

        displayRawProgressImage() {
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
            gl.useProgram(this.glState.shader.blit.program);
            twgl.setUniforms(this.glState.shader.blit, {
                inputImage: this.glState.fb.curr.attachments[0]
            });
            twgl.drawBufferInfo(gl, this.glState.vao);
        },

        isRenderDone() {
            return this.samplesSoFar >= this.samples;
        },

        async getFinalImage() {
            return new Promise((resolve, reject) => {
                this.displayRawProgressImage();
                gl.flush();
                options.canvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                        return;
                    }
                    reject("Failed to create canvas blob.");
                }, "image/png");
            })
        },

        async merge(url: string, samples: number) {
            console.log("attempting merge...");
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = url;
                img.crossOrigin = "anonymous";
                console.log(img.complete);
                const loadfn = () => {
                    twgl.createTexture(gl, { src: img, target: gl.TEXTURE_2D, minMag: gl.NEAREST }, (err: any, tex: WebGLTexture) => {
                        console.log(err, "reached create tex callback", tex);
                        // this.doRenderStep();
                        // this.displayProgressImage();
                        gl.viewport(0, 0, ...this.dimensions);
                        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
                        // gl.useProgram(this.glState.shader.merge.program);
                        // twgl.setUniforms({
                        //     color1: this.glState.fb.curr.attachments[0],
                        //     color2: tex,
                        //     factor: (samples > this.samplesSoFar) ? (1 - this.samplesSoFar / samples) : (samples / this.samplesSoFar)
                        // });
                        // twgl.drawBufferInfo(gl, this.glState.vao);
                                
                        gl.useProgram(this.glState.shader.blit.program);
                        twgl.setUniforms(this.glState.shader.blit, {
                            inputImage: tex
                        });
                        twgl.drawBufferInfo(gl, this.glState.vao);
                        this.samplesSoFar += samples;
                        //gl.deleteTexture(tex);
                        resolve();
                    });
                };
                img.onload = () => {    
                    const canv = document.createElement("canvas");
                    canv.width = 512;
                    canv.height = 512;
                    canv.getContext("2d")?.drawImage(img, 0, 0);
                    document.body.appendChild(canv);
                    loadfn();
                }
                // 
                
                // if (img.complete) {
                //     loadfn();
                // } else {
                //     img.onload = loadfn;
                // } 
            });
        },

        isError: false
    } as RenderTask
}