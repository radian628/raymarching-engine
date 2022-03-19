import * as raymarch from "../../module/build/main.mjs";
import React, { useEffect } from "react";
import * as ReactDOM from "react-dom";
import { quat, vec3 } from "gl-matrix";

import "./index.css";

type KeyPollSource = { [key: string]: boolean };

interface NumberInputOptions<T> {
  label: string;
  isRange: boolean;
  min: number;
  max: number;
  step: number;
  state: [object, Function]
  setting: string;
}

const NumberInput = <T, >(props: NumberInputOptions<T>) => {
  let getNum = e => {
    let value = Number(e.currentTarget.value);  
    props.state[1]({
      ...props.state[0],
      [props.setting]: value
    });
  }

  return (
    <React.Fragment>
      <label>{props.label}</label>
      <input 
        value={props.state[0][props.setting]}
        type={props.isRange ? "range" : "number"} 
        min={props.min} 
        max={props.max} 
        step={props.step}
        onChange={getNum}
      >
      </input>
      <br></br>
    </React.Fragment>
  )
}

const RaymarcherGUI = (props) => {

  let [renderGUIOptions, setRenderGUIOptions] = React.useState<RenderTaskGUIOptions>({
    primaryRaymarchingSteps: 64,
    reflections: 16,
    focalPlaneDistance: -0.5,
    circleOfConfusionSize: -3,
    isRealtimeMode: true,
    blendFactor: 0.95
  });

  props.guiOptions.current = Object.assign({}, renderGUIOptions);

  let getNum = (setting: keyof RenderTaskGUIOptions, transformer?: (x: number) => number) => {
    if (!transformer) transformer = e => e;
    
    return e => {
      let value = transformer(Number(e.currentTarget.value));  
      setRenderGUIOptions({
        ...renderGUIOptions,
        [setting]: value
      });
    }
  }

  let getBool = (setting: keyof RenderTaskGUIOptions) => {
    return e => {
      let value = e.currentTarget.checked;  
      setRenderGUIOptions({
        ...renderGUIOptions,
        [setting]: value
      });
    }
  } 

  const state: [object, Function] = [renderGUIOptions, setRenderGUIOptions];

  return (
    <div id="gui-container">
      <div id="gui-settings">
        <button>Do High Quality Render</button>
        <h2>High Quality Render Settings</h2>
        <h2>Render Settings</h2>
        <NumberInput state={state} label="Raymarching Steps" isRange={true} min={0} max={128} step={1} setting="primaryRaymarchingSteps"></NumberInput>
        <NumberInput state={state} label="Reflections" isRange={true} min={0} max={15} step={1} setting="reflections"></NumberInput>
        <NumberInput state={state} label="DOF Focal Plane Distance" isRange={true} min={-4} max={4} step={0.00001} setting="focalPlaneDistance"></NumberInput>
        <NumberInput state={state} label="Circle of Confusion Size" isRange={true} min={-4} max={1} step={0.00001} setting="circleOfConfusionSize"></NumberInput>
        <label>Realtime Mode</label>
        <input type="checkbox" checked={renderGUIOptions.isRealtimeMode} onChange={getBool("isRealtimeMode")}></input>
        <br></br>
        <label>Blend Factor</label>
        <input value={renderGUIOptions.blendFactor} min="0" max="1" step="0.000001" onChange={getNum("blendFactor")}></input>
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
      const guiOpts = props.guiOptions.current;
      if (guiOpts) {
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
            blendFactor: (vec3.length(movementVec) == 0 && deltaRotation == 0) ? guiOpts.blendFactor : 0,
            dof: {
              distance: Math.pow(10, guiOpts.focalPlaneDistance),
              amount: Math.pow(10, guiOpts.circleOfConfusionSize),
            },
            fogDensity: 0.4,
          },
        }); 
        let task = renderTask.next();
      }

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
  blendFactor: number;
}

const Raymarcher = () => {
  let renderTaskGUIOptions = React.useRef<RenderTaskGUIOptions>();

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