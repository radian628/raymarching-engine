import * as raymarch from "../../module/build/main.mjs";
import React, { useEffect } from "react";
import * as ReactDOM from "react-dom";
import { quat, vec3 } from "gl-matrix";

import "./index.css";

type KeyPollSource = { [key: string]: boolean };

const RaymarcherGUI = (props) => {

  let getNum = (setting: keyof RenderTaskGUIOptions, transformer?: (x: number) => number) => {
    if (!transformer) transformer = e => e;
    return e => {
      props.guiOptions.current[setting] = transformer(Number(e.currentTarget.value));  
    }
  }

  let getBool = (setting: keyof RenderTaskGUIOptions) => {
    return e => { props.guiOptions.current[setting] = e.currentTarget.checked };
  } 

  return (
    <div id="gui-container">
      <div id="gui-settings">
        <label>Raymarching Steps</label>
        <input type="range" min="0" max="128" step="1" onChange={getNum("primaryRaymarchingSteps")}></input>
        <br></br>
        <label>Reflections</label>
        <input type="range" min="0" max="15" step="1" onChange={getNum("reflections")}></input>
        <br></br>
        <label>DOF Focal Plane Distance</label>
        <input type="range" min="-4" max="4" step="0.00001" onChange={getNum("focalPlaneDistance", v => Math.pow(10, v))}></input>
        <br></br>
        <label>DOF Circle of Confusion Size</label>
        <input type="range" min="-4" max="1" step="0.00001" onChange={getNum("circleOfConfusionSize", v => Math.pow(10, v))}></input>
        <br></br>
        <label>Realtime Mode</label>
        <input type="checkbox" onChange={getBool("isRealtimeMode")}></input>
        <br></br>
      </div>
    </div>
  )
}

const MainCanvas = (props) => {


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
      canvasDomNode.width = window.innerWidth/1;
      canvasDomNode.height = window.innerHeight/1;
      renderState = raymarch.createRenderState({
        width:  window.innerWidth/1,
        height:  window.innerHeight/1,
        canvas: canvasDomNode,
      });
    });

    window.dispatchEvent(new Event("resize"));

    let pos: vec3 = [0, 0, 3.17];
    let rot: quat = [0,0,0,0];
    quat.rotateY(quat.identity(rot), rot, Math.PI);

    function loop() {
      const isControllingViewer = document.pointerLockElement === canvasDomNode;
      //console.log(keysDown);
      const guiOpts = props.guiOptions.current;
      let movementVec: vec3 = [0, 0, 0];
      if (isControllingViewer) {
        quat.rotateY(rot, rot, mouseMoveX / 300);
        quat.rotateX(rot, rot, mouseMoveY / 300);
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
        vec3.add(pos, pos, vec3.mul(movementVec, movementVec, [0.05, 0.05, 0.05]));
      }
      let deltaRotation = isControllingViewer ? Math.hypot(mouseMoveX, mouseMoveY) : 0;
      mouseMoveX = 0;
      mouseMoveY = 0;
      let renderTask = raymarch.doRenderTask({
        state: renderState,
        subdivX: 1,
        subdivY: 1,
        iterations: 1,
        shaderCompileOptions: {
          change: false, 
          isRealtimeMode: guiOpts.isRealtimeMode, 
        },

        uniforms: {
          camera: {
            position: pos,
            rotation: rot
          },
          fovs: [1.5 * window.innerWidth / window.innerHeight, 1.5],
          primaryRaymarchingSteps: guiOpts.primaryRaymarchingSteps,
          reflections: guiOpts.reflections,
          isAdditive: false,
          blendFactor: (vec3.length(movementVec) == 0 && deltaRotation == 0) ? 0.97 : 0,
          dof: {
            distance: guiOpts.focalPlaneDistance,
            amount: guiOpts.circleOfConfusionSize,
          },
          fogDensity: 0.0,
        },
      }); 
      console.log(props.guiOptions.current.primaryRaymarchingSteps);
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

interface RenderTaskGUIOptions {
  primaryRaymarchingSteps: number;
  reflections: number;
  focalPlaneDistance: number;
  circleOfConfusionSize: number;
  isRealtimeMode: boolean;
}

const Raymarcher = () => {
  let renderTaskGUIOptions = React.useRef<RenderTaskGUIOptions>({
    primaryRaymarchingSteps: 64,
    reflections: 16,
    focalPlaneDistance: 0.25,
    circleOfConfusionSize: 0.01,
    isRealtimeMode: true
  });

  return (<React.Fragment>
    <MainCanvas guiOptions={renderTaskGUIOptions}></MainCanvas>
    <RaymarcherGUI guiOptions={renderTaskGUIOptions}></RaymarcherGUI>
  </React.Fragment>)
}

async function main() {
  await raymarch.loadShaders();
  ReactDOM.render(<Raymarcher></Raymarcher>, document.getElementById("app-container"));
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