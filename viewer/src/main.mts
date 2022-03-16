import * as raymarch from "../../module/build/main.mjs";

let canvas = document.getElementById("canvas") as HTMLCanvasElement;



let renderState = raymarch.createRenderState({
    width: 1920,
    height: 1080,
    canvas
});

let renderTask = raymarch.doRenderTask({
  state: renderState,
  subdivX: 4,
  subdivY: 4,
  iterations: 512,
  shaderCompileOptions: { change: false },

  uniforms: {
      camera: {
          position: [0, 0, 1.1],
          rotation: [1, 0, 0, 0]
      },
      fovs: [1.5 * 16/9, 1.5],
      primaryRaymarchingSteps: 64,
      reflections: 7,
      isAdditive: true,
      blendFactor: 0.03,
      dof: {
          distance: 0.25,
          amount: 0.005
      },
      fogDensity: 0.2
  }
});

let loopIndex = 0;
function loop() {
  let task = renderTask.next(); 
  if (!task.done) {
    loopIndex++;
    requestAnimationFrame(loop);
  }
}

loop();