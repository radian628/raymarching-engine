let RAYMARCHER_SRC = await (await fetch("./resources/raymarcher.glsl")).text();
let VERTEX_SRC = await (await fetch("./resources/vertex.glsl")).text();

interface ShaderCompileOptions {
    change: boolean
}

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
    gl: WebGL2RenderingContext,
    shader: {
        fragment: WebGLShader,
        vertex: WebGLShader,
        compileOptions: ShaderCompileOptions,
        program: WebGLProgram
    }
};

interface RenderTaskOptions {
    state: RenderState,
    subdivX: number,
    subdivY: number,
    iterations: number,
    shaderCompileOptions: ShaderCompileOptions
};

interface Uniforms {
    [key: string]: ["f" | "i" | "ui", number | number[]]
}

function setUniforms(uniforms: Uniforms, program: WebGLProgram, gl: WebGL2RenderingContext) {
    for (let [uniformName, [uniformType, uniformValue]] of Object.entries(uniforms)) {
        let uniformLocation = gl.getUniformLocation(program, uniformName);
        if (typeof uniformValue == "number") {
            gl["uniform1" + uniformType](uniformLocation, uniformValue);
        } else {
            gl["uniform" + uniformValue.length + uniformType + "v"](uniformLocation, uniformValue);
        }
    }
}

function makeShader(shader: WebGLShader, source: string, gl: WebGL2RenderingContext) {
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(`Error compiling shader:`);
        console.log(gl.getShaderInfoLog(shader));
    }
}

function makeProgram(program: WebGLProgram, vShader: WebGLShader, fShader: WebGLShader, gl: WebGL2RenderingContext) {
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
}

function isShaderUpdateNeeded(oldOpts: ShaderCompileOptions, newOpts: ShaderCompileOptions) {
    return !Object.keys(oldOpts).every(key => oldOpts[key] == newOpts[key]);
}

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

export function* doRenderTask(options: RenderTaskOptions) {
    let gl = options.state.gl;
    
    gl.viewport(0, 0, options.state.width, options.state.height);

    if (isShaderUpdateNeeded(
        options.state.shader.compileOptions, 
        options.shaderCompileOptions
    )) {
        let shader = options.state.shader;
        gl.deleteShader(shader.fragment);
        shader.fragment = gl.createShader(gl.FRAGMENT_SHADER);
        makeShader(shader.fragment, RAYMARCHER_SRC, gl);
        gl.deleteProgram(shader.program);
        shader.program = gl.createProgram();
        makeProgram(shader.program, shader.vertex, shader.fragment, gl);
        console.log(gl.getError());
        console.log("got here");
    }

    gl.enable(gl.SCISSOR_TEST);

    //gl.bindTexture

    gl.useProgram(options.state.shader.program);
    console.log(gl.getError());

    gl.bindBuffer(gl.ARRAY_BUFFER, options.state.fullscreenQuadBuffer);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, options.state.texture.prev);

    setUniforms({
       cameraPosition: ["f", [0, 0, 1.1]],
       cameraRotation: ["f", [1, 0, 0, 0]],
       fovs: ["f", [1.5 * 16/9, 1.5]],
       primaryRaymarchingSteps: ["ui", 64],
       reflections: ["ui", 3],
       randNoise: ["f", [Math.random(), Math.random()]],
       isAdditive: ["i", 1],
       blendFactor: ["f", 0.1],
       focalPlaneDistance: ["f", 0.25],
       circleOfConfusionRadius: ["f", 0.0],
       prevFrameColor: ["i", 0]
    }, options.state.shader.program, gl);

    for (let y = 0; y < options.subdivY; y++) {
        for (let x = 0; x < options.subdivX; x++) {
            gl.scissor(
                options.state.width * x / options.subdivX,
                options.state.height * y / options.subdivY,
                options.state.width / options.subdivX,
                options.state.height / options.subdivY
            );
            for (let i = 0; i < options.iterations; x++) {
                setUniforms({
                    randNoise: ["f", [Math.random(), Math.random()]]
                }, options.state.shader.program, gl);
                gl.bindFramebuffer(
                    gl.DRAW_FRAMEBUFFER, 
                    options.state.framebuffer.current
                );
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                gl.bindFramebuffer(
                    gl.READ_FRAMEBUFFER, 
                    options.state.framebuffer.current
                );
                gl.bindFramebuffer(
                    gl.DRAW_FRAMEBUFFER, 
                    options.state.framebuffer.prev
                );
                gl.blitFramebuffer(
                    0, 0, options.state.width, options.state.height,
                    0, 0, options.state.width, options.state.height,
                    gl.COLOR_BUFFER_BIT, gl.NEAREST
                );

                gl.bindFramebuffer(
                    gl.READ_FRAMEBUFFER, 
                    options.state.framebuffer.current
                );
                gl.bindFramebuffer(
                    gl.DRAW_FRAMEBUFFER, 
                    null
                );
                gl.blitFramebuffer(
                    0, 0, options.state.width, options.state.height,
                    0, 0, options.state.width, options.state.height,
                    gl.COLOR_BUFFER_BIT, gl.NEAREST
                );
                yield;
            }
        }
    }
}

function setNearestFilter(tex: WebGLTexture, gl: WebGL2RenderingContext) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

export function createRenderState(options: RenderStateOptions): RenderState {
    let gl = options.canvas.getContext("webgl2", { 
        antialias: false,
        preserveDrawingBuffer: true
    });
    gl.getExtension("EXT_color_buffer_float");
    gl.getExtension("OES_texture_float_linear");

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
    setNearestFilter(prevTexture, gl);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA16F, options.width, options.height, 0, gl.RGBA, gl.HALF_FLOAT, null
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, prevFramebuffer);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D,
        prevTexture, 0
    );

    let currentTexture = gl.createTexture();
    setNearestFilter(currentTexture, gl);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA16F, options.width, options.height, 0, gl.RGBA, gl.HALF_FLOAT, null
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, currentFramebuffer);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D,
        currentTexture, 0
    );

    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    makeShader(vertexShader, VERTEX_SRC, gl);    

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
        shader: {
            vertex: vertexShader,
            fragment: fragmentShader,
            compileOptions: { change: true },
            program: gl.createProgram()
        },
        width: options.width,
        height: options.height
    };

    return renderState;
}
