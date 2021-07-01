//Define canvas for WebGL.
// let c = document.getElementById("canvas");

// let recording = document.getElementById("recording");
// let submit = document.getElementById("submit");

class TiledRenderer {
    async init(raymarcher) {
        this.raymarcher = raymarcher;
        this.done = true;
    }

    async startRender(renderData, partitions, samples, url) {
        this.url = url;
        this.time = 0;
        this.presentInterval = 1;
        this.renderData = renderData;
        this.partitions = partitions;
        this.partitionX = 0;
        this.partitionY = 0;
        this.isFirstIteration = true;

        this.samples = samples;
        this.sampleIndex = 0;

        this.framesRendered = 0;

        this.raymarcher.setAllShaderState(this.renderData[0], true);
        this.raymarcher.registerCustomUniforms();
        this.raymarcher.gl.enable(this.raymarcher.gl.SCISSOR_TEST);
        await this.raymarcher.recompileShader();

        this.done = false;
    }

    async endRender() {
        this.raymarcher.gl.disable(this.raymarcher.gl.SCISSOR_TEST);
    }

    setScissor() {        
        this.raymarcher.gl.scissor(
            this.partitionXSize * this.partitionX,
            this.partitionYSize * this.partitionY,
            this.partitionXSize,
            this.partitionYSize
        );
    }

    async nextFrame() {
        this.time++;

        this.partitionXSize = this.raymarcher.surface.width / this.partitions;
        this.partitionYSize = this.raymarcher.surface.height / this.partitions;
        
        let rmState = this.renderData[this.framesRendered];
        if (this.resetScissorBefore) {
            this.setScissor();
            this.resetScissorBefore = false;
        }

        if (this.isFirstIteration) {
            this.raymarcher.setAllShaderState(rmState);
            console.log(rmState);
            this.isFirstIteration = false;
        }

        await this.raymarcher.renderSingleFrame();

        this.sampleIndex++;

        if (this.resetScissor) {
            this.setScissor();
            this.resetScissor = false;
        }
        
        if (this.sampleIndex >= this.samples) {
            this.sampleIndex = 0;
            this.partitionX++;
            if (this.partitionX > this.partitions) {
                this.partitionX = 0;
                this.partitionY++;
                if (this.partitionY > this.partitions) {
                    
                    this.raymarcher.gl.finish();
                    await fetch(this.url.replace("%INDEX%", this.framesRendered), {
                        method: "PUT",
                        headers: {
                            "Content-Type": "image/png"
                        },
                        body: this.raymarcher.canvas.toDataURL()
                    });

                    this.raymarcher.presentFramebuffer();

                    this.partitionY = 0;
                    this.framesRendered++;
                    this.raymarcher.resetState = 0;
                    this.raymarcher.gl.scissor(0, 0, this.raymarcher.canvas.width, this.raymarcher.canvas.height);
                    await this.raymarcher.recompileShader();
                    await this.raymarcher.renderSingleFrame();
                    this.sampleIndex = -1;
                    this.resetScissorBefore = true;
                    this.isFirstIteration = true;
                }
            }
            this.resetScissorBefore = true;
        }

        if (this.time % this.presentInterval == 0) {
            this.raymarcher.presentFramebuffer();
        }
        if (!(this.framesRendered < this.renderData.length)) {
            this.done = true;
        }
    }
}

// //Initialize the stuff
// let raymarcher;
// async function init() {
    
//     raymarcher = new Raymarcher(createCanvasGraphicsInterface(c));
//     raymarcher.setShaderState("resolution", [1920, 1080]);
//     raymarcher.setAllShaderState(composeThis, true);
//     await raymarcher.init();
//     raymarcher.registerCustomUniforms();

//     raymarcher.gl.enable(raymarcher.gl.SCISSOR_TEST);

//     // raymarcher.resetState = 0;
//     // raymarcher.additiveBlending = true;
//     // await raymarcher.recompileShader();
//     // await raymarcher.renderSingleFrame();

//     // raymarcher.gl.scissor(
//     //     partitionXSize * partitionX,
//     //     partitionYSize * partitionY,
//     //     partitionXSize,
//     //     partitionYSize
//     // );
    
//     nextFrame();
// }

// let frames;
// let composeThis;

// async function asyncSleep(ms) {
//     return new Promise((resolve, reject) => {
//         setTimeout(() => {
//             resolve();
//         }, ms);
//     });
// }

// let accumulateCount = 512;

// let presentInterval = 1;

// let sampleIndex = 0;

// let partitions = 8;

// let partitionX = 0;
// let partitionY = 0;

// let partitionXSize = c.width / partitions;
// let partitionYSize = c.height / partitions;

// let resetScissor = true;
// let resetScissorBefore = true;

// //Draw loop
// let framesRendered = 0;

// let frameOffset = 0;

// let isFirstIteration = true;

// let time = 0;

// function setScissor() {
//     raymarcher.gl.scissor(
//         partitionXSize * partitionX,
//         partitionYSize * partitionY,
//         partitionXSize,
//         partitionYSize
//     );
// }

// function nextFrame() {

//     //setTimeout(() => {
//         requestAnimationFrame(drawLoop);
//     //}, 1000);
// }

// async function drawLoop() {
//     time++;
    
//     let rmState = frames[framesRendered];

//     if (rmState.resolution) {
//         c.width = rmState.resolution[0];
//         c.height = rmState.resolution[1];
//         partitionXSize = c.width / partitions;
//         partitionYSize = c.height / partitions;
//     }

    
//     if (resetScissorBefore) {
//         setScissor();
//         resetScissorBefore = false;
//     }

//     if (isFirstIteration) {
//         raymarcher.setAllShaderState(rmState);
//         isFirstIteration = false;
//     }

//     await raymarcher.renderSingleFrame();

//     sampleIndex++;

//     if (resetScissor) {
//         setScissor();
//         resetScissor = false;
//     }
    
//     if (sampleIndex >= accumulateCount) {
//         sampleIndex = 0;
//         partitionX++;
//         if (partitionX > partitions) {
//             partitionX = 0;
//             partitionY++;
//             if (partitionY > partitions) {
                
//                 raymarcher.gl.finish();
//                 await fetch(`http://localhost:42064/idk/frame${framesRendered + frameOffset}.png`, {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "image/png"
//                     },
//                     body: c.toDataURL(),
//                     mode: "no-cors"
//                 });

//                 raymarcher.presentFramebuffer();

//                 partitionY = 0;
//                 framesRendered++;
//                 raymarcher.resetState = 0;
//                 raymarcher.gl.scissor(0, 0, c.width, c.height);
//                 await raymarcher.recompileShader();
//                 await raymarcher.renderSingleFrame();
//                 sampleIndex = -1;
//                 resetScissorBefore = true;
//                 isFirstIteration = true;
//             }
//         }
//         resetScissorBefore = true;
//     }

//     if (time % presentInterval == 0) {
//         raymarcher.presentFramebuffer();
//     }
//     if (framesRendered < frames.length) {
//         nextFrame();
//     }
// }

// (async () => {

//     let req = await fetch("./recordings/idk.json");
//     let json = await req.json();
//     console.log(json);
//     json.forEach((e, i) => {
//         delete e.cubeSize;
//         delete e.speed;
//         e.resolution = [1920, 1080];
//         e.additiveBlending = true;
//         e.uBlendFactor = 0.24;
//         e.uTime = i;
//         e.uTimeMotionBlurFactor = 2;


//         e.reflections = 2;

//         //e.uDOFStrength = 0.1;
//         //e.uFocalPlaneDistance = 5;
//         //e.uShadowSoftness = 0.01;

//         e.raymarchingSteps = 64;
//         e.uRayHitThreshold = 0.00001;

//         e.transmissionRaymarchingSteps = 64;
//         e.transmissionRayCount = 0;
//         //e.uTimeMotionBlurFactor = 15;
//         // e.reflections = 5;
//         // e.reflectionRoughness = 0.5;

//         // e.uAOStrength = 0.0;
//         // e.uShadowBrightness = 0.0;

//         // //e.uFractalRotation = quatMultiply(e.uFractalRotation, quatAngleAxis(0.00035 * i, [0, 0, 1]));

// 	    // e.raymarchingSteps = 128;
//         // e.additiveBlending = true;  
//         // e.uBlendFactor = 0.01;
// 	    // e.fractalIterations = 17;
//         // e.uDOFStrength = 0.001;
//         // e.uFocalPlaneDistance = 0.5;

//         // e.uShadowSoftness = 0.1;

//         if (i != 0) {
//             e.uMotionBlurPrevPos = json[i - 1].uPosition;
//             e.uMotionBlurPrevRot = json[i - 1].rotation;
//         }
//     });
//     //json = JSON.stringify(json.slice(1200));
//     if (frameOffset == 0) {
//         frames = json;
//         composeThis = frames[0];
//     } else {
//         frames = json.splice(frameOffset);
//         console.log(composeThis);
//         composeThis = Raymarcher.composeShaderState(json);
//     }

//     //let fullFrames = JSON.parse(json);
//     //frames = JSON.parse(json);
//     console.log(frames);
    
//     let rm = new Raymarcher(createCanvasGraphicsInterface(c));
//     rm.setShaderState("resolution", [1920, 1080]);
//     await rm.init();
//     let tr = new TiledRenderer();
//     tr.init(rm);
//     tr.startRender(frames, 4, 3, "http://localhost:42064/idk/frame%INDEX%.png");

//     //init();
    
    
// })();