import * as raymarch from "../../module/build/main.mjs";
import * as React from "react";
import * as ReactDOM from "react-dom";

function MainCanvas () {
  let canvas = <canvas ref={c => {
    main(c);
  }} id="canvas" width="1920" height="1080"></canvas>
  return canvas;
}

ReactDOM.render(MainCanvas(), document.body);

async function main(canvas: HTMLCanvasElement) {
  await raymarch.loadShaders();
  let renderState = raymarch.createRenderState({
      width: 1920/4,
      height: 1080/4,
      canvas
  });

  let renderTask = raymarch.doRenderTask({
    state: renderState,
    subdivX: 1,
    subdivY: 1,
    iterations: 1,
    shaderCompileOptions: { change: false },

    uniforms: {
        camera: {
            position: [0, 0, 1.1],
            rotation: [1, 0, 0, 0]
        },
        fovs: [1.5 * 16/9, 1.5],
        primaryRaymarchingSteps: 64,
        reflections: 3,
        isAdditive: true,
        blendFactor: 2, 
        dof: {
            distance: 0.25, 
            amount: 0.0
        },
        fogDensity: 0.0,
        isRealtimeMode: true
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
}