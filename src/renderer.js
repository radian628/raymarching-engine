//Define canvas for WebGL.
let c = document.getElementById("canvas");

let recording = document.getElementById("recording");
let submit = document.getElementById("submit");

//Initialize the stuff
let rmSettings;
let raymarcher;
async function init() {
    
    raymarcher = new Raymarcher(createCanvasGraphicsInterface(c));
    raymarcher.setShaderState("resolution", [1920, 1080]);
    raymarcher.setAllShaderState(composeThis, true);
    await raymarcher.init();
    raymarcher.registerCustomUniforms();

    raymarcher.gl.enable(raymarcher.gl.SCISSOR_TEST);

    // raymarcher.resetState = 0;
    // raymarcher.additiveBlending = true;
    // await raymarcher.recompileShader();
    // await raymarcher.renderSingleFrame();

    // raymarcher.gl.scissor(
    //     partitionXSize * partitionX,
    //     partitionYSize * partitionY,
    //     partitionXSize,
    //     partitionYSize
    // );
    
    nextFrame();
}

let frames;
let composeThis;

async function asyncSleep(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

let accumulateCount = 16;

let presentInterval = 1;

let sampleIndex = 0;

let partitions = 2;

let partitionX = 0;
let partitionY = 0;

let partitionXSize = c.width / partitions;
let partitionYSize = c.height / partitions;

let resetScissor = true;
let resetScissorBefore = true;

//Draw loop
let framesRendered = 0;

let frameOffset = 0;

let isFirstIteration = true;

let time = 0;

function setScissor() {
    raymarcher.gl.scissor(
        partitionXSize * partitionX,
        partitionYSize * partitionY,
        partitionXSize,
        partitionYSize
    );
}

function nextFrame() {

    //setTimeout(() => {
        requestAnimationFrame(drawLoop);
    //}, 1000);
}

async function drawLoop() {
    time++;
    
    let rmState = frames[framesRendered];

    if (rmState.resolution) {
        c.width = rmState.resolution[0];
        c.height = rmState.resolution[1];
        partitionXSize = c.width / partitions;
        partitionYSize = c.height / partitions;
    }

    
    if (resetScissorBefore) {
        setScissor();
        resetScissorBefore = false;
    }

    if (isFirstIteration) {
        raymarcher.setAllShaderState(rmState);
        isFirstIteration = false;
    }

    await raymarcher.renderSingleFrame();

    sampleIndex++;

    if (resetScissor) {
        setScissor();
        resetScissor = false;
    }
    
    if (sampleIndex >= accumulateCount) {
        sampleIndex = 0;
        partitionX++;
        if (partitionX > partitions) {
            partitionX = 0;
            partitionY++;
            if (partitionY > partitions) {
                
                raymarcher.gl.finish();
                await fetch(`http://localhost:42064/fractalsphere/frame${framesRendered + frameOffset}.png`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "image/png"
                    },
                    body: c.toDataURL(),
                    mode: "no-cors"
                });

                raymarcher.presentFramebuffer();

                partitionY = 0;
                framesRendered++;
                raymarcher.resetState = 0;
                raymarcher.gl.scissor(0, 0, c.width, c.height);
                await raymarcher.recompileShader();
                await raymarcher.renderSingleFrame();
                sampleIndex = -1;
                resetScissorBefore = true;
                isFirstIteration = true;
            }
        }
        resetScissorBefore = true;
    }

    if (time % presentInterval == 0) {
        raymarcher.presentFramebuffer();
    }
    if (framesRendered < frames.length) {
        nextFrame();
    }
}

(async () => {

    let req = await fetch("./recordings/fractalloop.json");
    let json = await req.json();
    console.log(json);
    json.forEach((e, i) => {
        delete e.cubeSize;
        delete e.speed;
        e.resolution = [1920, 1080];
        e.additiveBlending = true;
        e.uBlendFactor = 0.05;
        e.uTime = i;
        e.uTimeMotionBlurFactor = 2;

        e.reflections = 1;

        //e.uDOFStrength = 0.1;
        //e.uFocalPlaneDistance = 5;
        //e.uShadowSoftness = 0.01;

        e.raymarchingSteps = 64;
        e.uRayHitThreshold = 0.00001;
        //e.uTimeMotionBlurFactor = 15;
        // e.reflections = 5;
        // e.reflectionRoughness = 0.5;

        // e.uAOStrength = 0.0;
        // e.uShadowBrightness = 0.0;

        // //e.uFractalRotation = quatMultiply(e.uFractalRotation, quatAngleAxis(0.00035 * i, [0, 0, 1]));

	    // e.raymarchingSteps = 128;
        // e.additiveBlending = true;  
        // e.uBlendFactor = 0.01;
	    // e.fractalIterations = 17;
        // e.uDOFStrength = 0.001;
        // e.uFocalPlaneDistance = 0.5;

        // e.uShadowSoftness = 0.1;

        if (i != 0) {
            e.uMotionBlurPrevPos = json[i - 1].uPosition;
            e.uMotionBlurPrevRot = json[i - 1].rotation;
        }
    });
    //json = JSON.stringify(json.slice(1200));
    if (frameOffset == 0) {
        frames = json;
        composeThis = frames[0];
    } else {
        frames = json.splice(frameOffset);
        console.log(composeThis);
        composeThis = Raymarcher.composeShaderState(json);
    }

    //let fullFrames = JSON.parse(json);
    //frames = JSON.parse(json);
    console.log(frames);
    init();
    
    
})();