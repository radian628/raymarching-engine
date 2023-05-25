import { mat4 } from "gl-matrix";
import { UniformCountAndData, UniformData } from "./Uniforms";

type RenderJobLight =
  | {
      type: "point";
      position: [number, number, number];
      color: [number, number, number];
      size: number;
    }
  | {
      type: "sun";
      direction: [number, number, number];
      color: [number, number, number];
    };

export type RenderJobSchema = {
  // how many iterations for each ray reflection?
  reflectionIterationCounts: number[];

  // gradient sampling normal delta/offset
  normalDelta: number;

  // source code for SDF shader. Provides several parameters
  // distance, diffuse, specular, emission, normal (for normal mapping), and subsurf
  sdfShaderSource: string;

  // for if the SDF has its own shader parameters
  customShaderParameters: { [key: string]: UniformData };

  // fog density, non-log scale
  fogDensity: number;

  // used for motion blur for moving objects
  time: number;
  timeDelta: number;

  dof: {
    amount: number;
    distance: number;
    showFocusedArea: boolean;
  };

  camera: {
    position: [number, number, number];
    // used for calculating motion blur
    motion: [number, number, number];
    // 3x3 rotation matrix
    rotation: mat4;
    mode:
      | {
          type: "perspective";
          fov: number;
        }
      | {
          type: "orthographic";
          size: number;
        }
      | {
          type: "panoramic";
          angleX: number;
          angleY: number;
        };
  };

  render: {
    // number of samples per pixel
    samplesPerPixel: number;

    // how bright the screen should be when all samples are averaged together
    exposure: number;

    // how much the screen should be subdivided
    subdivisions: number;

    width: number;
    height: number;
    frameid: number;
    blendWithPreviousFrameFactor: number;
    sampleYieldInterval: number;
    blendMode: "additive" | "mix";
    renderMode: "full" | "preview";
  };

  lights: RenderJobLight[];
};
