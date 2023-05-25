export type ShaderCache = {
  getShader: (src: string, type: number) => WebGLShader | ShaderError;
};
export type ProgramCache = {
  getProgram: (vsource: string, fsource: string) => WebGLProgram | ShaderError;
};

export type ShaderError = {
  type: "vertex" | "fragment" | "program";
  infoLog: string;
};

export function createShaderFromSource(
  gl: WebGL2RenderingContext,
  src: string,
  type: number
): WebGLShader | ShaderError {
  const shader = gl.createShader(type);
  if (!shader)
    return {
      type: type == gl.VERTEX_SHADER ? "vertex" : "fragment",
      infoLog: "Failed to create shader.",
    };
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const infolog = gl.getShaderInfoLog(shader);
    console.error("Shader compile error: \n" + infolog);
    return {
      type: type == gl.VERTEX_SHADER ? "vertex" : "fragment",
      infoLog: infolog,
    };
  }
  return shader;
}

export function createShaderCache(gl: WebGL2RenderingContext) {
  const cache = new Map<String, WebGLShader | ShaderError>();

  return {
    getShader: (src: string, type: number) => {
      let shader = cache.get(src);
      if (shader === undefined) {
        shader = createShaderFromSource(gl, src, type);
        cache.set(src, shader);
      }
      return shader;
    },
  };
}

export function createProgramFromShaders(
  gl: WebGL2RenderingContext,
  vertex: WebGLShader,
  fragment: WebGLShader
): WebGLProgram | ShaderError {
  const prog = gl.createProgram();
  if (!prog)
    return {
      type: "program",
      infoLog: "Failed to create program.",
    };
  gl.attachShader(prog, vertex);
  gl.attachShader(prog, fragment);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const infoLog = gl.getProgramInfoLog(prog);
    console.error("Program link error: \n" + infoLog);
    return {
      type: "program",
      infoLog,
    };
  }
  return prog;
}

export function createProgramFromStrings(
  gl: WebGL2RenderingContext,
  shaderCache: ShaderCache,
  vsource: string,
  fsource: string
): WebGLProgram | ShaderError {
  const vshader = shaderCache.getShader(vsource, gl.VERTEX_SHADER);
  const fshader = shaderCache.getShader(fsource, gl.FRAGMENT_SHADER);
  if (!(vshader instanceof WebGLShader)) return vshader;
  if (!(fshader instanceof WebGLShader)) return fshader;
  const prog = createProgramFromShaders(gl, vshader, fshader);
  return prog;
}

export function createProgramCache(gl: WebGL2RenderingContext) {
  const shaderCache = createShaderCache(gl);
  const cache = new Map<string, Map<string, WebGLProgram | ShaderError>>();

  return {
    getProgram: (vsource: string, fsource: string) => {
      let fShaderMap = cache.get(vsource);
      if (!fShaderMap) {
        fShaderMap = new Map();
        cache.set(vsource, fShaderMap);
      }

      let prog = fShaderMap.get(fsource);

      if (prog === undefined) {
        prog = createProgramFromStrings(gl, shaderCache, vsource, fsource);
        if (fShaderMap) {
          fShaderMap.set(fsource, prog ?? null);
        } else {
          const innerMap = new Map();
          innerMap.set(fsource, prog);
          cache.set(vsource, innerMap);
        }
      }

      return prog ?? undefined;
    },
  };
}
