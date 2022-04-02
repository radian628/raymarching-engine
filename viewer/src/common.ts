
export interface RenderTaskGUIOptions {
  primaryRaymarchingSteps: number;
  reflections: number;
  focalPlaneDistance: number;
  circleOfConfusionSize: number;
  isRealtimeMode: boolean;
  blendFactor: number;
  cameraSpeed: number;
  isDoingHighQualityRender: boolean;
  resolutionFactor: number;
  fogDensity: number;

  pointLights: PointLightState[];

  hqReflections: number;
  hqRaymarchingSteps: number;
  hqSampleCount: number;
  hqExposureAmount: number;
  hqWidth: number;
  hqHeight: number;
}

export interface PointLightState {
  position: [number, number, number];
  brightness: number;
  color: [number, number, number];
}

export interface CameraTransform {
  position:[number,number,number];
  rotation:[number, number, number, number];
}