import * as raymarch from "../../module/build/main.mjs";

let canvas = document.getElementById("canvas") as HTMLCanvasElement;

let renderState = raymarch.createRenderState({
    width: 1920/4,
    height: 1080/4,
    canvas
});

let renderTask = raymarch.doRenderTask({
  state: renderState,
  subdivX: 1,
  subdivY: 1,
  iterations: 40,
  shaderCompileOptions: { change: false }
});

let loopIndex = 0;
function loop() {
  renderTask.next(); 
  if (loopIndex < 40) {
    loopIndex++;
    requestAnimationFrame(loop);
  }
}

loop();