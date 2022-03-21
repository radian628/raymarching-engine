import { getLeadingCommentRanges } from "../node_modules/typescript/lib/typescript";

let RAYMARCHER_SRC;
let VERTEX_SRC;
let GAMMA_CORRECTION_SRC;

export async function loadShaders() {
  RAYMARCHER_SRC = await (await fetch("../resources/raymarcher.glsl")).text();
  VERTEX_SRC = await (await fetch("../resources/vertex.glsl")).text();
  GAMMA_CORRECTION_SRC = await (await fetch("../resources/gamma_correction.glsl")).text();
}
interface ShaderCompileOptions {
  change: boolean;
  isRealtimeMode: boolean;
}

interface RenderStateOptions {
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

interface RenderState {
  previousRenderTarget: RenderTargetState;
  currentRenderTarget: RenderTargetState;
  fullscreenQuadBuffer: WebGLBuffer;
  width: number;
  height: number;
  gl: WebGL2RenderingContext;
  shader: {
    fragment: WebGLShader;
    vertex: WebGLShader;
    compileOptions: ShaderCompileOptions;
    program: WebGLProgram;
    gammaCorrection: WebGLProgram;
  };
}

interface RenderTaskOptions {
  state: RenderState;
  subdivX: number;
  subdivY: number;
  iterations: number;
  shaderCompileOptions: ShaderCompileOptions;

  uniforms: {
    camera: {
      position: [number, number, number];
      rotation: [number, number, number, number];
    };
    fovs: [number, number];
    primaryRaymarchingSteps: number;
    reflections: number;
    isAdditive: boolean;
    blendFactor: number;
    dof: {
      distance: number;
      amount: number;
    };
    fogDensity: number;
  };
}

interface Uniforms {
  [key: string]: ["f" | "i" | "ui", number | number[]];
}

function setUniforms(
  uniforms: Uniforms,
  program: WebGLProgram,
  gl: WebGL2RenderingContext
) {
  for (let [uniformName, [uniformType, uniformValue]] of Object.entries(
    uniforms
  )) {
    let uniformLocation = gl.getUniformLocation(program, uniformName);
    if (typeof uniformValue == "number") {
      gl["uniform1" + uniformType](uniformLocation, uniformValue);
    } else {
      gl["uniform" + uniformValue.length + uniformType + "v"](
        uniformLocation,
        uniformValue
      );
    }
  }
}

function makeShader(
  shader: WebGLShader,
  source: string,
  gl: WebGL2RenderingContext
) {
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(`Error compiling shader:`);
    console.log(gl.getShaderInfoLog(shader));
  }
}

function makeProgram(
  program: WebGLProgram,
  vShader: WebGLShader,
  fShader: WebGLShader,
  gl: WebGL2RenderingContext
) {
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
}

function isShaderUpdateNeeded(
  oldOpts: ShaderCompileOptions,
  newOpts: ShaderCompileOptions
) {
  return !Object.keys(oldOpts).every((key) => oldOpts[key] == newOpts[key]);
}

function doMultiNestedLoopInner(
  callback: Function,
  indices: number[],
  args: number[]
) {
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

function setShaderDefine(shaderSource, define) {
  return shaderSource.replace("INSERT_DEFINES_HERE", "INSERT_DEFINES_HERE\n#define " + define + "\n");
}

function setShaderOptions(options: ShaderCompileOptions): string {
  let shaderSource = RAYMARCHER_SRC;
  if (options.isRealtimeMode) shaderSource = setShaderDefine(shaderSource, "IS_REALTIME_MODE");
  return shaderSource;
}


export function clear(state: RenderState) {
  let gl = state.gl;
  gl.colorMask(true, true, true, true);
  gl.clearColor(0, 0, 0, 1);
  //gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, state.currentRenderTarget.framebuffer);
  //gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 1]);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, state.previousRenderTarget.framebuffer);
  //gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 1]);
  gl.clear(gl.COLOR_BUFFER_BIT);
}


export function* doRenderTask(options: RenderTaskOptions) {
  let gl = options.state.gl;


  if (
    isShaderUpdateNeeded(
      options.state.shader.compileOptions,
      options.shaderCompileOptions
    )
  ) {
    console.log("SHADER COMPILED.");
    let shader = options.state.shader;
    gl.deleteShader(shader.fragment);
    shader.fragment = gl.createShader(gl.FRAGMENT_SHADER);
    makeShader(shader.fragment, setShaderOptions(options.shaderCompileOptions), gl);
    gl.deleteProgram(shader.program);
    shader.program = gl.createProgram();
    makeProgram(shader.program, shader.vertex, shader.fragment, gl);
    options.state.shader.compileOptions = options.shaderCompileOptions;
  }

  gl.enable(gl.SCISSOR_TEST);

  //gl.bindTexture


  gl.bindBuffer(gl.ARRAY_BUFFER, options.state.fullscreenQuadBuffer);



  for (let y = 0; y < options.subdivY; y++) {
    for (let x = 0; x < options.subdivX; x++) {
      for (let i = 0; i < options.iterations; i++) {
        gl.scissor(
          (options.state.width * x) / options.subdivX,
          (options.state.height * y) / options.subdivY,
          options.state.width / options.subdivX,
          options.state.height / options.subdivY
        );

        gl.useProgram(options.state.shader.program);
        gl.bindFramebuffer(
          gl.DRAW_FRAMEBUFFER,
          options.state.currentRenderTarget.framebuffer
        );
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);
        
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, options.state.previousRenderTarget.colorTex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, options.state.previousRenderTarget.normalTex);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, options.state.previousRenderTarget.albedoTex);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, options.state.previousRenderTarget.positionTex);
        
        setUniforms(
          {
            cameraPosition: ["f", options.uniforms.camera.position],
            cameraRotation: ["f", options.uniforms.camera.rotation],
            fovs: ["f", options.uniforms.fovs],
            primaryRaymarchingSteps: ["ui", options.uniforms.primaryRaymarchingSteps],
            reflections: ["ui", options.uniforms.reflections],
            randNoise: ["f", [Math.random(), Math.random()]],
            isAdditive: ["i", options.uniforms.isAdditive ? 1 : 0],
            blendFactor: ["f", options.uniforms.blendFactor],
            focalPlaneDistance: ["f", options.uniforms.dof.distance],
            circleOfConfusionRadius: ["f", options.uniforms.dof.amount],
            prevFrameColor: ["i", 0],
            prevFrameNormal: ["i", 1],
            prevFrameAlbedo: ["i", 2],
            prevFramePosition: ["i", 3],
            fogDensity: ["f", options.uniforms.fogDensity]
          },
          options.state.shader.program,
          gl
        );
        
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.scissor(
          0, 0,
          options.state.width,
          options.state.height
        );

        gl.bindFramebuffer(
          gl.READ_FRAMEBUFFER,
          options.state.currentRenderTarget.framebuffer
        );
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, options.state.previousRenderTarget.framebuffer);
        for (let i = 0; i < 4; i++) {
          gl.readBuffer(gl.COLOR_ATTACHMENT0 + i);
          gl.drawBuffers([...new Array(i).fill(null), gl.COLOR_ATTACHMENT0 + i]); 
          gl.blitFramebuffer(
            0,
            0,
            options.state.width,
            options.state.height,
            0,
            0,
            options.state.width,
            options.state.height,
            gl.COLOR_BUFFER_BIT,
            gl.NEAREST
          );
        }

        gl.bindFramebuffer(
          gl.READ_FRAMEBUFFER,
          options.state.currentRenderTarget.framebuffer
        );


        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, options.state.currentRenderTarget.colorTex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, options.state.currentRenderTarget.normalTex);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, options.state.currentRenderTarget.albedoTex);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, options.state.currentRenderTarget.positionTex);
        gl.useProgram(options.state.shader.gammaCorrection);
        setUniforms(
          {
            inputImage: ["i", 0],
            inputNormal: ["i", 1],
            inputAlbedo: ["i", 2],
            inputPosition: ["i", 3],
            gamma: ["f", 1/2.2]
          },
          options.state.shader.gammaCorrection,
          gl
        );

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
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



interface RenderTargetState {
  framebuffer: WebGLFramebuffer,
  colorTex: WebGLTexture,
  normalTex: WebGLTexture,
  albedoTex: WebGLTexture,
  positionTex: WebGLTexture
};

function setupRenderTargetFramebuffer(gl: WebGL2RenderingContext, width, height): RenderTargetState {
  let framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  let colorTex = gl.createTexture();
  let normalTex = gl.createTexture();
  let albedoTex = gl.createTexture();
  let positionTex = gl.createTexture();
  
  [colorTex, normalTex, albedoTex, positionTex].forEach((tex, i) => {
    setNearestFilter(tex, gl);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA16F,
      width,
      height,
      0,
      gl.RGBA,
      gl.HALF_FLOAT,
      null
    );
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0 + i,
      gl.TEXTURE_2D,
      tex,
      0
    );
  });

  return {
    framebuffer, colorTex, normalTex, albedoTex, positionTex
  };
}





export function createRenderState(options: RenderStateOptions): RenderState {
  let gl = options.canvas.getContext("webgl2", {
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (!gl.getExtension("EXT_color_buffer_float")) alert("Your computer does not support floating point color buffers. The program may not work as expected.");
  //if (!gl.getExtension("OES_texture_float_linear")) alert("");

  gl.viewport(0, 0, options.width, options.height);

  let fullscreenQuadBuffer = gl.createBuffer();
  let fullscreenQuadBufferData = new Float32Array([
    -1, 1, 1, 1, 1, -1, -1, 1, 1, -1, -1, -1,
  ]);
  gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, fullscreenQuadBufferData, gl.STATIC_DRAW);

  let currentRTState = setupRenderTargetFramebuffer(gl, options.width, options.height);
  let prevRTState = setupRenderTargetFramebuffer(gl, options.width, options.height);

  let vertexShader = gl.createShader(gl.VERTEX_SHADER);
  let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

  let gammaCorrectionShader = gl.createShader(gl.FRAGMENT_SHADER);

  makeShader(vertexShader, VERTEX_SRC, gl);
  makeShader(gammaCorrectionShader, GAMMA_CORRECTION_SRC, gl);

  let gammaCorrectionProgram = gl.createProgram();
  makeProgram(gammaCorrectionProgram, vertexShader, gammaCorrectionShader, gl);

  let renderState: RenderState = {
    gl,
    fullscreenQuadBuffer,
    previousRenderTarget: prevRTState,
    currentRenderTarget: currentRTState,
    shader: {
      vertex: vertexShader,
      fragment: fragmentShader,
      compileOptions: { change: true, isRealtimeMode: false },
      program: gl.createProgram(),
      gammaCorrection: gammaCorrectionProgram
    },
    width: options.width,
    height: options.height,
  };

  return renderState;
}
