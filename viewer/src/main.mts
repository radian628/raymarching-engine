import * as raymarch from "../../module/build/main.mjs";

let canvas = document.getElementById("canvas") as HTMLCanvasElement;

let renderState = raymarch.createRenderState({
    width: 1920,
    height: 1080,
    canvas
});

let renderTask = raymarch.doRenderTask({
  state: renderState,
  subdivX: 1,
  subdivY: 1,
  iterations: 4,
  shaderCompileOptions: { change: false }
});

for (let i = 0; i < 4; i++) {
  renderTask.next(); 
}