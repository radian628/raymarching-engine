interface RenderStateOptions {
    width: number,
    height: number,
    canvas: HTMLCanvasElement
}

interface RenderState {
    framebuffer: {
        prev: WebGLFramebuffer,
        current: WebGLFramebuffer
    },
    texture: {
        prev: WebGLTexture,
        current: WebGLTexture
    },
    fullscreenQuadBuffer: WebGLBuffer,
    width: number,
    height: number,
    gl: WebGL2RenderingContext
};

interface RenderTaskOptions {
    state: RenderState,
    subdivX: number,
    subdivY: number,
    iterations: number
};

function doMultiNestedLoopInner(callback: Function, indices: number[], args: number[]) {
    if (args.length == 0) {
        callback(...indices);
    } else {
        for (let i = 0; i < args[0]; i++) {
            doMultiNestedLoopInner(callback, indices.concat(i), args.slice(1, -1));
        }
    }
}

function doMultiNestedLoop(callback: Function, ...args: number[]) {
    doMultiNestedLoopInner(callback, [], args);
}

function* doRenderTask(options: RenderTaskOptions) {
    let gl = options.state.gl;
    let shader = gl.createShader(gl.VERTEX_SHADER);
    
    for (let y = 0; y < options.subdivY; y++) {
        for (let x = 0; x < options.subdivX; x++) {
            for (let i = 0; i < options.iterations; x++) {
                
                yield;
            }
        }
    }
}


function createRenderState(options: RenderStateOptions): RenderState {
    let gl = options.canvas.getContext("webgl2");

    let fullscreenQuadBuffer = gl.createBuffer();
    let fullscreenQuadBufferData = new Float32Array([
        -1, 1, 1, 1, 1, -1,
        -1, 1, 1, -1, -1, -1
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, fullscreenQuadBufferData, gl.STATIC_DRAW);

    let prevFramebuffer = gl.createFramebuffer();
    let currentFramebuffer = gl.createFramebuffer();

    let prevTexture = gl.createTexture();
    let currentTexture = gl.createTexture();

    let renderState: RenderState = {
        gl,
        fullscreenQuadBuffer,
        framebuffer: {
            prev: prevFramebuffer,
            current: currentFramebuffer
        },
        texture: {
            prev: prevTexture,
            current: currentTexture
        },
        width: options.width,
        height: options.height
    };

    return renderState;
}