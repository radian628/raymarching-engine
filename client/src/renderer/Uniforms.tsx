export type UniformCountAndData =
  | { count: 1; data: [number] }
  | { count: 2; data: [number, number] }
  | { count: 3; data: [number, number, number] }
  | { count: 4; data: [number, number, number, number] };

export type UniformData = {
  type: "f" | "i" | "ui";
} & UniformCountAndData;

export namespace u {
  export const float = (x: number): UniformData => {
    return { count: 1, data: [x], type: "f" };
  };
  export const vec2 = (x: number, y: number): UniformData => {
    return { count: 2, data: [x, y], type: "f" };
  };
  export const vec3 = (x: number, y: number, z: number): UniformData => {
    return { count: 3, data: [x, y, z], type: "f" };
  };
  export const vec4 = (
    x: number,
    y: number,
    z: number,
    w: number
  ): UniformData => {
    return { count: 4, data: [x, y, z, w], type: "f" };
  };
  export const int = (x: number): UniformData => {
    return { count: 1, data: [x], type: "i" };
  };
}

export function setUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniforms: Record<string, UniformData>
) {
  for (const [name, settings] of Object.entries(uniforms)) {
    //@ts-ignore
    gl["uniform" + settings.count + settings.type + "v"](
      gl.getUniformLocation(program, name),
      settings.data
    );
  }
}
