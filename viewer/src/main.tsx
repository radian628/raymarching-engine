import * as raymarch from "../../module/build/main.mjs";
import React, { useEffect } from "react";
import * as ReactDOM from "react-dom";
import { quat, vec3 } from "gl-matrix";

import "./index.css";

type KeyPollSource = { [key: string]: boolean };

const MainCanvas = () => {


  let canvasRef = canvasDomNode => { 
    let renderState;
    let keysDown: KeyPollSource = {};
    document.addEventListener("keydown", e => {
      keysDown[e.key.toLowerCase()] = true;
    });
    document.addEventListener("keyup", e => {
      keysDown[e.key.toLowerCase()] = false;
    });

    window.addEventListener("resize", () => {
      canvasDomNode.width = window.innerWidth;
      canvasDomNode.height = window.innerHeight;
      renderState = raymarch.createRenderState({
        width:  window.innerWidth,
        height:  window.innerHeight,
        canvas: canvasDomNode,
      });
    });

    window.dispatchEvent(new Event("resize"));

    let z = 0;

    function loop() {
      console.log(keysDown);
      if (keysDown.w) z -= 0.001;
      let renderTask = raymarch.doRenderTask({
        state: renderState,
        subdivX: 1,
        subdivY: 1,
        iterations: 1,
        shaderCompileOptions: { change: false },

        uniforms: {
          camera: {
            position: vec3.add([0, 0, 0], [0, 0, 3.97], [z, z, z]),
            rotation: quat.rotateY(
              quat.identity([0, 0, 0, 0]),
              quat.identity([0, 0, 0, 0]),
              3
            ),
          },
          fovs: [1.5 * window.innerWidth / window.innerHeight, 1.5],
          primaryRaymarchingSteps: 64,
          reflections: 3,
          isAdditive: false,
          blendFactor: 0.95,
          dof: {
            distance: 0.25,
            amount: 0.0,
          },
          fogDensity: 0.0,
          isRealtimeMode: true,
        },
      }); 
      let task = renderTask.next();

      requestAnimationFrame(loop);
    }
    loop();
  }
  return <canvas
    ref={canvasRef}
    id="canvas"
    width="1920"
    height="1080"
  ></canvas>;
}


async function main() {
  await raymarch.loadShaders();
  ReactDOM.render(<MainCanvas></MainCanvas>, document.getElementById("app-container"));
  //let renderState = ;

  // let z = 0;
  // let currentRotation = 0;

  // function loop() {
  //   z -= 0.001;
  //   currentRotation += 0.005;

  //   let renderTask = raymarch.doRenderTask({
  //     state: renderState,
  //     subdivX: 1,
  //     subdivY: 1,
  //     iterations: 1,
  //     shaderCompileOptions: { change: false },

  //     uniforms: {
  //       camera: {
  //         position: vec3.add([0, 0, 0], [0, 0, 3.97], [z, z, z]),
  //         rotation: quat.rotateY(
  //           quat.identity([0, 0, 0, 0]),
  //           quat.identity([0, 0, 0, 0]),
  //           currentRotation
  //         ),
  //       },
  //       fovs: [(1.5 * 16) / 9, 1.5],
  //       primaryRaymarchingSteps: 64,
  //       reflections: 3,
  //       isAdditive: false,
  //       blendFactor: 0.5,
  //       dof: {
  //         distance: 0.25,
  //         amount: 0.0,
  //       },
  //       fogDensity: 0.0,
  //       isRealtimeMode: true,
  //     },
  //   });

  //   let task = renderTask.next();

  //   requestAnimationFrame(loop);
  // }
  // loop();
}


main();