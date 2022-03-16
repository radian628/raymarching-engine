import * as raymarch from "../../module/build/main.mjs";
import React, { useEffect } from "react";
import * as ReactDOM from "react-dom";
import { quat, vec3 } from "gl-matrix";

import "./index.css";

type KeyPollSource = { [key: string]: boolean };

const MainCanvas = () => {


  let canvasRef = canvasDomNode => { 
    canvasDomNode.addEventListener("click", e => {
      canvasDomNode.requestPointerLock();
    })

    let renderState;
    let keysDown: KeyPollSource = {};
    document.addEventListener("keydown", e => {
      keysDown[e.key.toLowerCase()] = true;
    });
    document.addEventListener("keyup", e => {
      keysDown[e.key.toLowerCase()] = false;
    });

    let mouseMoveX = 0;
    let mouseMoveY = 0;
    document.addEventListener("mousemove", e => {
      mouseMoveX += e.movementX;
      mouseMoveY += e.movementY;
    })

    window.addEventListener("resize", () => {
      canvasDomNode.width = window.innerWidth/2;
      canvasDomNode.height = window.innerHeight/2;
      renderState = raymarch.createRenderState({
        width:  window.innerWidth/2,
        height:  window.innerHeight/2,
        canvas: canvasDomNode,
      });
    });

    window.dispatchEvent(new Event("resize"));

    let pos: vec3 = [0, 0, 3.97];
    let rot: quat = [0,0,0,0];
    quat.identity(rot);

    function loop() {
      //console.log(keysDown);
      quat.rotateY(rot, rot, mouseMoveX / 300);
      quat.rotateX(rot, rot, mouseMoveY / 300);
      let deltaRotation = Math.hypot(mouseMoveX, mouseMoveY);
      mouseMoveX = 0;
      mouseMoveY = 0;
      let movementVec: vec3 = [0, 0, 0];
      if (keysDown.w) {
        vec3.add(movementVec, movementVec, [0, 0, 1]);
      } 
      if (keysDown.a) {
        vec3.add(movementVec, movementVec, [-1, 0, 0]);
      } 
      if (keysDown.s) {
        vec3.add(movementVec, movementVec, [0, 0, -1]);
      } 
      if (keysDown.d) {
        vec3.add(movementVec, movementVec, [1, 0, 0]);
      } 
      if (keysDown.shift) {
        vec3.add(movementVec, movementVec, [0, -1, 0]);
      } 
      if (keysDown[" "]) {
        vec3.add(movementVec, movementVec, [0, 1, 0]);
      } 
      vec3.transformQuat(movementVec, movementVec, rot);
      vec3.add(pos, pos, vec3.mul(movementVec, movementVec, [0.01, 0.01, 0.01]));
      let renderTask = raymarch.doRenderTask({
        state: renderState,
        subdivX: 1,
        subdivY: 1,
        iterations: 1,
        shaderCompileOptions: { change: false },

        uniforms: {
          camera: {
            position: pos,
            rotation: rot
          },
          fovs: [1.5 * window.innerWidth / window.innerHeight, 1.5],
          primaryRaymarchingSteps: 32,
          reflections: 3,
          isAdditive: false,
          blendFactor: (vec3.length(movementVec) == 0 && deltaRotation == 0) ? 0.95 : 0.5,
          dof: {
            distance: 0.25,
            amount: 0.01,
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