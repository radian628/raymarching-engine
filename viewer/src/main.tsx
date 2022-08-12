import * as raymarch from "../../module/build/main.mjs";
import React, { useEffect } from "react";
import * as ReactDOM from "react-dom";
import { quat, vec3 } from "gl-matrix";
import { RaymarcherGUI, KeyPollSource } from "./gui";
import { RenderTaskGUIOptions, CameraTransform } from "./common.js";

import "./index.css";


const MainCanvas = (props) => {

  let cameraTransform = props.cameraTransform;

  let canvasRef = (canvasDomNode) => {
    canvasDomNode.addEventListener("click", (e) => {
      canvasDomNode.requestPointerLock();
    });

    let renderState;
    let keysDown: KeyPollSource = {};
    document.addEventListener("keydown", (e) => {
      keysDown[e.key.toLowerCase()] = true;
    });
    document.addEventListener("keyup", (e) => {
      keysDown[e.key.toLowerCase()] = false;
    });

    let mouseMoveX = 0;
    let mouseMoveY = 0;
    document.addEventListener("mousemove", (e) => {
      mouseMoveX += e.movementX;
      mouseMoveY += e.movementY;
    });

    const resizeCanvas = (width, height) => {
      if (Math.round(canvasDomNode.width) == Math.round(width) && Math.round(canvasDomNode.height) == Math.round(height)) return;
      canvasDomNode.width = Math.max(
        width,
        1
      );
      canvasDomNode.height = Math.max(
        height,
        1
      );
      renderState = raymarch.createRenderState({
        width: canvasDomNode.width,
        height: canvasDomNode.height,
        canvas: canvasDomNode,
      });
    }

    window.addEventListener("resize", () => {
      const guiOpts = props.guiOptions.current;
      if (!guiOpts.isDoingHighQualityRender) {
        resizeCanvas(
          window.innerWidth * props.guiOptions.current.resolutionFactor,
          window.innerHeight * props.guiOptions.current.resolutionFactor
        );
      }
    });

    //let pos: vec3 = [0, 0, 3.17];
    //let rot: quat = [0, 0, 0, 0];
    quat.rotateY(quat.identity(cameraTransform.current.rotation), cameraTransform.current.rotation, Math.PI);

    let highQualityRenderTask;
    let isHighQualityRenderTaskDone = false;

    let hasNotResized = true;


    function loop() {
      const isControllingViewer = document.pointerLockElement === canvasDomNode;
      const guiOpts = props.guiOptions.current;
      if (guiOpts) {
        if (hasNotResized) {
          window.dispatchEvent(new Event("resize"));
          hasNotResized = false;
        }
        if (guiOpts.isDoingHighQualityRender) {
          if (!highQualityRenderTask) {
            resizeCanvas(guiOpts.hqWidth, guiOpts.hqHeight);
            raymarch.clear(renderState);
            //raymarch.present(renderState);
            //window.dispatchEvent(new Event("resize"));
            isHighQualityRenderTaskDone = false;
            highQualityRenderTask = raymarch.doRenderTask({
              state: renderState,
              subdivX: 4,
              subdivY: 4,
              iterations: guiOpts.hqSampleCount,
              shaderCompileOptions: {
                change: false,
                isRealtimeMode: false,
                pointLightCount: guiOpts.pointLights.length
              },

              uniforms: {
                camera: {
                  position: cameraTransform.current.position,
                  rotation: cameraTransform.current.rotation,
                },
                fovs: [(1.5 * window.innerWidth) / window.innerHeight, 1.5],
                primaryRaymarchingSteps: guiOpts.hqRaymarchingSteps,
                reflections: guiOpts.hqReflections,
                isAdditive: true,
                blendFactor: guiOpts.hqExposureAmount / guiOpts.hqSampleCount,
                dof: {
                  distance: Math.pow(10, guiOpts.focalPlaneDistance),
                  amount: Math.pow(10, guiOpts.circleOfConfusionSize),
                }, 
                fogDensity: Math.pow(10, guiOpts.fogDensity),

                pointLightRaymarchingSteps: 64,
                pointLightPositions: guiOpts.pointLights.map(e => e.position).flat(),
                pointLightColors: guiOpts.pointLights.map(e => e.color.map(c => c * e.brightness)).flat(),
                pointLightShadowBrightnesses: guiOpts.pointLights.map(e => 0)
              },
            });
          }

          if (!isHighQualityRenderTaskDone) {
            let taskProgress = highQualityRenderTask.next();
            isHighQualityRenderTaskDone = taskProgress.done;
          }
        } else {
          highQualityRenderTask = undefined;
          let movementVec: vec3 = [0, 0, 0];
          if (isControllingViewer) {
            quat.rotateY(cameraTransform.current.rotation, cameraTransform.current.rotation, mouseMoveX / 300);
            quat.rotateX(cameraTransform.current.rotation, cameraTransform.current.rotation, mouseMoveY / 300);
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
            let speed = Math.pow(10, guiOpts.cameraSpeed);
            vec3.transformQuat(movementVec, movementVec, cameraTransform.current.rotation);
            vec3.add(
              cameraTransform.current.position,
              cameraTransform.current.position,
              vec3.mul(movementVec, movementVec, [speed, speed, speed])
            );
          }
          let deltaRotation = isControllingViewer
            ? Math.hypot(mouseMoveX, mouseMoveY)
            : 0;
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
              pointLightCount: guiOpts.pointLights.length
            },

            uniforms: {
              camera: {
                position: cameraTransform.current.position,
                rotation: cameraTransform.current.rotation,
              },
              fovs: [(1.5 * window.innerWidth) / window.innerHeight, 1.5],
              primaryRaymarchingSteps: guiOpts.primaryRaymarchingSteps,
              reflections: guiOpts.reflections,
              isAdditive: false,
              blendFactor:
                vec3.length(movementVec) == 0 && deltaRotation == 0
                  ? guiOpts.blendFactor
                  : 0.1,
              dof: {
                distance: Math.pow(10, guiOpts.focalPlaneDistance),
                amount: Math.pow(10, guiOpts.circleOfConfusionSize),
              },
              fogDensity: Math.pow(10, guiOpts.fogDensity),

              pointLightRaymarchingSteps: 64,
              pointLightPositions: guiOpts.pointLights.map(e => e.position).flat(),
              pointLightColors: guiOpts.pointLights.map(e => e.color.map(c => c * e.brightness)).flat(),
              pointLightShadowBrightnesses: guiOpts.pointLights.map(e => 0)
            },
          });
          let task = renderTask.next();
        }
      }

      requestAnimationFrame(loop);
    }
    loop();
  };
  return (
    <canvas ref={canvasRef} id="canvas" width="1920" height="1080"></canvas>
  );
};

const Raymarcher = () => {
  const cameraTransform = React.useRef<CameraTransform>();

  cameraTransform.current = ({
    position: [0, 0, 3],
    rotation: [0, 0, 0, 0]
  });

  let renderTaskGUIOptions = React.useRef<RenderTaskGUIOptions>();

  return (
    <React.Fragment>
      <MainCanvas guiOptions={renderTaskGUIOptions} cameraTransform={cameraTransform}></MainCanvas>
      <RaymarcherGUI guiOptions={renderTaskGUIOptions} cameraTransform={cameraTransform}></RaymarcherGUI>
    </React.Fragment>
  );
};

async function main() {
  await raymarch.loadShaders();
  ReactDOM.render(
    <Raymarcher></Raymarcher>,
    document.getElementById("app-container")
  );
}

main();
