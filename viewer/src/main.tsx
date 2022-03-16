import * as raymarch from "../../module/build/main.mjs";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { quat, vec3 } from "gl-matrix";

import "./index.css";

function MainCanvas () {
  let canvas = <canvas ref={c => {
    main(c);
  }} id="canvas" width="480" height="270"></canvas>
  return canvas;
}

ReactDOM.render(MainCanvas(), document.getElementById("app-container"));

let z = 0;

let currentRotation = 0;

async function main(canvas: HTMLCanvasElement) {
  await raymarch.loadShaders();
  let renderState = raymarch.createRenderState({
      width: 1920/4,
      height: 1080/4,
      canvas
  });

  function loop() {

    z -= 0.001;
    currentRotation += 0.001;

    let renderTask = raymarch.doRenderTask({
      state: renderState,
      subdivX: 1,
      subdivY: 1,
      iterations: 1,
      shaderCompileOptions: { change: false },

      uniforms: {
          camera: {
              position: vec3.add([0, 0, 0], [0, 0, 3.97], [z, z, z]),
              rotation: quat.rotateY(quat.identity([0,0,0,0]), quat.identity([0,0,0,0]), currentRotation)
          },
          fovs: [1.5 * 16/9, 1.5],
          primaryRaymarchingSteps: 64,
          reflections: 3,
          isAdditive: false,
          blendFactor: 0.5, 
          dof: {
              distance: 0.25, 
              amount: 0.0
          },
          fogDensity: 0.0,
          isRealtimeMode: true
      }
    });

    let task = renderTask.next();

    requestAnimationFrame(loop);
  }
  loop();
}