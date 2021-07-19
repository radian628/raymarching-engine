//Define canvas for WebGL.
var c = document.getElementById("canvas");

//COMPLETE
//Fix quaternion bug (rapid rotation messes it up) - complete
//Improve normal calculations - complete
//Fix framebuffer resize issue - complete
//Setup encapsulated raymarcher for proper linkages with GUI. - complete

//TODO:
//Add rendering system for slow, non-realtime renders + playback (like I did w/ the fractal)
//Stop settings from resetting to default values every single time a shader is changed (per-section resets?).

//=============================== USER INTERFACE =================================
let raymarcherSettings = {
    "Instructions": {
        description: "Use WASD, Space, and Shift to move. Press E to move the light source. Click the screen to control rotation w/ mouse. Use escape to exit rotation mode."
    },
    "UI and Viewer Controls": {
        settings: [
            {
                id: "hideUI",
                type: "checkbox",
                value: true,
                label: "Hide UI when controlling viewer",
                description: "If enabled, the UI rectangle will disappear completely while controlling the viewer's rotation and locking the mouse. Otherwise, it will be transparent.",
                indirect: true
            },
            {
                id: "playerSpeed",
                type: "range",
                min: -4,
                max: 1,
                value: -1,
                label: "Player Speed",
                transformer: num => {
                    return Math.pow(10, num);
                },
                description: "Controls how fast you can move with WASD, Space, and Shift. Scales logarithmically.",
                indirect: true
            },
            {
                id: "playerSmoothness",
                type: "range",
                min: 0,
                max: 1,
                value: 0.9,
                label: "Player Smoothness",
                description: "Controls how fast you slow down when not pressing a movement key.",
                indirect: true
            },
            {
                id: "cameraSmoothness",
                type: "range",
                min: 0,
                max: 1,
                value: 0,
                label: "Camera Turn Smoothness",
                description: "Controls how much 'friction' the camera has while turning. Use this to create a cinematic camera.",
                indirect: true
            },
            {
                id: "cameraAccel",
                type: "range",
                min: -2,
                max: 1,
                value: 0,
                transformer: num => {
                    return Math.pow(10, num) * 0.003;
                },
                label: "Camera Turn Acceleration",
                description: "Controls how fast the camera accelerates when turning. Scales logarithmically.",
                indirect: true
            },
            {
                id: "resolutionFactor",
                type: "number",
                value: 1,
                label: "Resolution Factor",
                description: "Controls the true resolution of the underlying framebuffer when compared to the screen. Lower values will increase performance, but will cause blurriness due to upscaling.",
                indirect: true,
                customChangeHandler: () => {
                    window.dispatchEvent(new Event("resize"));
                }
            }
        ]
    },
    "Lighting Controls": {
        settings: [
            {
                id: "usePointLightSource",
                type: "checkbox",
                value: true,
                label: "Use point light source.",
                description: "Allows you to set the position of a single point light source. Direct illumination with the point light source results in very little noise relative to illumination with other light sources (e.g. area lights). However, the point light source also nearly doubles the number of rays that need to be cast. Thus, removing it will lead to a significant increase in performance."
            },
            {
                id: "uShadowBrightness",
                type: "range",
                min: 0,
                max: 1,
                value: 0.5,
                label: "Shadow Brightness",
                description: "Sets the brightness of shaded areas. Set this to zero if attempting global illumination."
            },
            {
                id: "uAOStrength",
                type: "range",
                min: 0,
                max: 1,
                value: 1.0,
                label: "Ambient Occlusion Strength",
                description: "Determines the strength of the effect of Ambient Occlusion (AO). Ambient Occlusion darkens tight corners to simulate the difficulty of light reaching such a place. It is a rough approximation of how light tends to have difficulty reaching tight corners. Set this to zero if attempting global illumination."
            },
            {
                id: "reflections",
                type: "range",
                min: 1,
                max: 8,
                value: 1,
                step: 1,
                label: "Reflections",
                recompile: true,
                description: "Number of reflections to calculate (requires lots of computation!)."
            },
            {
                id: "uShadowSoftness",
                type: "range",
                min: -6,
                max: 1,
                value: -6,
                label: "Shadow Softness",
                transformer: num => {
                    return Math.pow(10, num) - Math.pow(10, -6);
                },
                description: "Blends the edges of shadows. Scales logarithmically."
            },
            {
                id: "uLightStrength",
                type: "range",
                min: -4,
                max: 4,
                value: 0,
                label: "Light Intensity",
                transformer: num => {
                    return Math.pow(10, num);
                },
                description: "Determines the intensity of the light source. Scales logarithmically."
            }
        ]
    },
    "Raymarching Controls": {
        settings: [
            {
                id: "raymarchingSteps",
                type: "range",
                min: 0,
                max: 1024,
                value: 24,
                step: 1,
                label: "Raymarching Steps",
                recompile: true,
                description: "Raymarching works by projecting rays from the viewer like a camera flash. These rays are marched forward in several steps, asymptotically approaching the surface they're rendering. This setting controls the maximum number of these steps. A higher value will lead to more detail, especially around tight corners and edges. However, it will also lead to a significant slowdown."
            },
            {
                id: "normalRaymarchingSteps",
                type: "range",
                min: 0,
                max: 64,
                value: 8,
                step: 1,
                label: "Normal-finding Raymarching Steps",
                recompile: true,
                description: "Sets the number of raymarching steps for rays used to calculate normals. Low values are faster, but can lead to lighting artifacts, especially with geometry facing only barely towards the viewer (just under 90 degrees). See the section on Raymarching Steps for more information. "
            },
            {
                id: "uRayHitThreshold",
                type: "range",
                min: -8,
                max: 0,
                value: -5.5,
                label: "Ray Hit Threshold",
                transformer: num => {
                    return Math.pow(10, num);
                },
                description: "Since rays asymptotically approach the surface of the fractal, they will never truly reach its surface, making it necessary to add a distance threshold, under which the rays will be considered to have hit the surface. This threshold is the Ray Hit Threshold. This setting scales logarithmically. See the Raymarching Steps setting for more information."
            },
            {
                id: "uNormalDelta",
                type: "range",
                min: -8,
                max: 0,
                value: -3.75,
                label: "Normal Delta",
                transformer: num => {
                    return Math.pow(10, num);
                },
                description: "The normal of a surface (basically, what direction it's pointing in) is calculated by marching additional rays, slightly offset from the original one. The 'normal delta' value determines how far these additional rays are from the primary one."
            },
            {
                id: "transmissionRaymarchingSteps",
                type: "range",
                min: 0,
                max: 256,
                value: 32,
                step: 1,
                label: "Transmission Raymarching Steps",
                recompile: true,
                description: "Determines the number of raymarching steps for transmission rays. See the description for Transmission Ray Steps for more information."
            },
            {
                id: "transmissionRayCount",
                type: "range",
                min: 0,
                max: 8,
                value: 0,
                step: 1,
                label: "Transmission Ray Count",
                recompile: true,
                description: "Determines the number of transmission rays. Transmission rays are rays that replicate the effect of light shining through fog, creating so-called 'god rays'."
            },
            {
                id: "samplesPerFrame",
                type: "range",
                min: 1,
                max: 20,
                value: 1,
                step: 1,
                label: "Samples Per Frame",
                recompile: true,
                description: "How many camera rays to cast out per frame."
            },
            {
                id: "reproject",
                type: "checkbox",
                value: false,
                label: "Reproject Previous Frame",
                recompile: true,
                description: "Enable blending for this setting to have any effect. By default, blending simply creates a trail, mixing the last and current frame. However, with reprojection enabled, the data from the previous frame is adjusted so that the edges of any object line up with those in the current frame. This way, the sampling done in the previous frame can be used in the current frame, cutting down on needless computation."
            },
            {
                id: "uReprojectionExtraSamples",
                type: "range",
                min: 0,
                max: 10,
                value: 0,
                step: 1,
                label: "Unreprojected Pixel Extra Samples",
                description: "If reprojection is enabled, pixels for which reprojection failed (i.e. areas which were occluded or not visible in the previous frame) may be sampled additional times in order to reduce noise in those areas. This setting determines how many of these extra samples will be made."
            },
            {
                id: "uStrobe",
                type: "number",
                value: 1,
                step: 1,
                label: "Render Fraction of Frame",
                description: "Fully render only 1 / Nth of the framebuffer every frame. Useful for reprojection of computationally expensive scenes when high FPS is desired."
            },
            {
                id: "uReprojectionEdgeThreshold",
                type: "number",
                // min: 0,
                // max: 1,
                value: 0.05,
                label: "Reprojection Edge Threshold",
                description: "Relative depth difference threshold to be considered when reprojecting. Lower values yield sharper edges and more detail at the cost of increased noise and chance of false positives."
            },
            {
                id: "uReprojectionAccumulationLimit",
                type: "number",
                // min: 0,
                // max: 1,
                value: 64,
                label: "Reprojection Accumulation Limit",
                description: "Determines the limit to the number of frames' worth of samples that will be reprojected before previous samples start being replaced. Lower values mean reprojection is better adapted to changes in lighting, but can lead to more noise. Higher values mean reprojection takes longer to update to a change in lighting, but has less noise."
            },
        ]
    },
    "Camera Controls": {
        settings: [
            {
                id: "additiveBlending",
                type: "checkbox",
                value: false,
                label: "Additive Blending",
                recompile: true,
                description: "Enables additive blending. Additive blending adds the current frame's colors to that of the previous frame (rather than replacing or mixing it). With this setting enabled, Previous Frame Trail is repurposed as the amount of the current frame to add. This option is useful for accumulating lots of samples for global illumination renders."
            },
            {
                id: "uBlendFactor",
                type: "number",
                // min: 0,
                // max: 1,
                value: 0.0,
                label: "Previous Frame Trail",
                description: "Proportion of current frame to blend with previous. If Additive Blending is enabled, this instead determines how much of the current frame to add to the accumulated samples."
            },
            {
                id: "linearFilterPreviousFrame",
                type: "checkbox",
                value: false,
                label: "Linearly Filter Previous Frame",
                description: "Linearly filters the previous frame when blending. This dramatically reduces noise when doing reprojection at the cost of the quality of sharp edges."
            },
            {
                id: "uFOV",
                type: "range",
                min: 0,
                max: 4,
                value: 1.5,
                label: "FOV",
                description: "Sets the field of view."
            },
            {
                id: "uDOFStrength",
                type: "range",
                min: -4,
                max: 0,
                value: -4,
                label: "Depth of Field Strength",
                transformer: num => {
                    return Math.pow(10, num) - Math.pow(10, -4);
                },
                description: "Controls strength of the Depth of Field (DoF) effect. Scales logarithmically."
            },
            {
                id: "uFocalPlaneDistance",
                type: "range",
                min: -6,
                max: 2,
                value: -0.8,
                label: "Focal Plane Distance",
                transformer: num => {
                    return Math.pow(10, num);
                },
                description: "Controls the distance of the camera's focal plane. Scales logarithmically."
            },
            {
                id: "motionBlur",
                type: "checkbox",
                value: false,
                label: "Camera Motion Blur",
                description: "Determines whether a motion blur effect is applied.",
                indirect: true
            },
            {
                id: "uTimeMotionBlurFactor",
                type: "range",
                value: 0,
                min: 0,
                max: 10,
                label: "Object Motion Blur",
                description: "Determines the strength of motion blur for objects in scene."
            }
        ]
    },
    "Denoiser Controls": {
        settings: [
            {
                id: "denoise",
                type: "checkbox",
                value: false,
                label: "Denoise",
                description: "Click to enable denoising."
            },
            {
                id: "uSigma",
                type: "range",
                value: 2,
                min: 0,
                max: 3,
                label: "Sigma",
                description: "Denoising kernel standard deviation."
            },
            {
                id: "uSigmaCoefficient",
                type: "range",
                value: 8,
                min: 0,
                max: 12,
                label: "Sigma Coefficient",
                description: "Denoising kernel sigma coefficient. Sigma * Sigma Coefficient equals denoising radius."
            },
            {
                id: "uSharpeningThreshold",
                type: "range",
                value: 0.180,
                min: 0,
                max: 0.5,
                label: "Sharpening Threshold",
                description: "Denoising kernel edge sharpening threshold."
            }
        ]
    }
}

let uiTabs = {
    "tutorial": {
        title: "Tutorial"
    },
    "ui-container": {
        title: "Settings"
    },
    "sdf-shader": {
        title: "Signed Distance Function Shader"
    },
    "recordings": {
        title: "Recordings"
    },
    "renders": {
        title: "Render a Recording"
    },
    "credits": {
        title: "Credits"
    }
};

let renderDataTransformer;

function createRaymarcherSettingsMenu(settingsContainer, uiContainer, settings, inputHandler) {
    let currentValues = {};
    let settingInputs = {};
    let bigHeader = document.createElement("h1");
    settingsContainer.appendChild(bigHeader);
    bigHeader.innerText = "Settings";

    Array.from(document.querySelectorAll(`#${uiContainer.id} .hover-explanation-container`)).forEach(elem => {
        elem.parentElement.removeChild(elem);
    });

    let hoverExplanationContainer = document.createElement("div");
    hoverExplanationContainer.className = "hover-explanation-container";
    uiContainer.appendChild(hoverExplanationContainer);

    let hoverExplanationHeader = document.createElement("h2");
    hoverExplanationContainer.appendChild(hoverExplanationHeader);

    let hoverExplanationDescription = document.createElement("p");
    hoverExplanationContainer.appendChild(hoverExplanationDescription);
    hoverExplanationDescription.innerText = "Hover over a setting to view information about it.";
    Object.keys(settings).forEach(headerName => {
        let header = document.createElement("h2");
        header.innerText = headerName;
        settingsContainer.appendChild(header);

        if (settings[headerName].description) {
            let desc = document.createElement("p");
            desc.innerText = settings[headerName].description;
            settingsContainer.appendChild(desc);
        }

        if (settings[headerName].settings) {
            settings[headerName].settings.forEach(setting => {
                let label = document.createElement("label");
                label.innerText = setting.label;
                label.className = "setting-label";

                let input = document.createElement("input");
                input.type = setting.type;

                if (setting.type == "range") {
                    input.min = setting.min;
                    input.max = setting.max;
                    input.className = "range-input";
                    input.step = setting.step || 0.001;
                } else if (setting.type == "number") {
                    input.className = "range-input";
                }

                let inputListener = e => {
                    let elem = e.currentTarget;
                    let value = (elem.type == "checkbox") ? elem.checked : elem.value;
                    if (elem.type == "number" || elem.type == "range") {
                        value = Number(value);
                    }
                    setting.value = value;
                    if (setting.transformer) value = setting.transformer(value);
                    currentValues[elem.id] = value;
                    console.log(e.type);
                    inputHandler(value, setting, e.type == "change");
                };


                if (setting.type == "checkbox") {
                    input.checked = setting.value;
                } else {
                    input.value = setting.value;
                }
                input.id = setting.id;

                inputListener({
                    currentTarget: input
                });


                input.addEventListener("input", inputListener);
                input.addEventListener("change", inputListener);

                if (setting.customChangeHandler) input.addEventListener("change", setting.customChangeHandler);

                label.addEventListener("mouseover", e => {
                    hoverExplanationHeader.innerText = setting.label;
                    hoverExplanationDescription.innerText = setting.description || "No description provided.";
                    //hoverExplanationContainer.style.top = `${label.getBoundingClientRect().y - hoverExplanationContainer.getBoundingClientRect().height / 2}px`;
                });

                settingsContainer.appendChild(label);
                label.appendChild(input);
                settingInputs[setting.id] = input;
                settingsContainer.appendChild(document.createElement("br"));
            });
        }
    });

    let settingsMenu = {
        values: currentValues,
        changeSettings (settingsToChange) {
            Object.keys(settingsToChange).forEach(key => {
                let inp = settingInputs[key];
                inp[inp.type == "checkbox" ? "checked" : "value"] = settingsToChange[key];
            });
            this.dispatchAll();
        },
        dispatchAll () {
            Object.keys(settingInputs).forEach(key => {
                let inp = settingInputs[key];
                inp.dispatchEvent(new Event("change"));
            });
        },
        getRawInputValueDump () {
            let values = {};
            Object.keys(settingInputs).forEach(key => {
                let inp = settingInputs[key];
                let value = inp.type == "checkbox" ? inp.checked : inp.value;
                if (inp.type == "range" || inp.type == "number") value = Number(value);
                values[key] = value;
            });
            return values;
        }
    };
    settingsMenu.dispatchAll();
    return settingsMenu;
}

function createUITabs(tabSwitcher, elemData) {
    let tabs = [];

    let hideAll = () => {
        tabs.forEach(tab => {
            tab.style.display = "none";
        });
    }

    Object.keys(elemData).forEach(key => {
        let elem = document.getElementById(key);
        tabs.push(elem);
        let elemDatum = elemData[key];

        let tabSwitchButton = document.createElement("button");
        tabSwitchButton.innerText = elemDatum.title;
        tabSwitchButton.onclick = () => {
            hideAll();
            elem.style.display = "block";
        }


        tabSwitcher.appendChild(tabSwitchButton);
    });

    hideAll();
}

function deleteAllChildren(elem) {
    while (elem.children.length > 0) elem.removeChild(elem.lastChild);
}


c.requestPointerLock = c.requestPointerLock ||
                            c.mozRequestPointerLock;
document.exitPointerLock = document.exitPointerLock ||
                            document.mozExitPointerLock;

c.onclick = function () {
    c.requestPointerLock();
}

var pointerLockEnabled = false;

document.addEventListener('pointerlockchange', pointerLockHandler, false);
document.addEventListener('mozpointerlockchange', pointerLockHandler, false);

function pointerLockHandler(e) {
    pointerLockEnabled = document.pointerLockElement === c ||
    document.mozPointerLockElement === c;
    if (pointerLockEnabled && rmSettings.values.hideUI) {
        document.getElementById("ui-tabs").style.opacity = 0;
    } else {
        document.getElementById("ui-tabs").style.opacity = null;
    }
}

document.addEventListener('mousemove', function (e) {
    if (pointerLockEnabled) {
        playerTransform.rotation[0] += e.movementX;
        playerTransform.rotation[1] += e.movementY;

    }
});


let keys = {};
let singleFrameKeys = {};
document.addEventListener("keydown", function (e) {
    keys[e.key.toLowerCase()] = true;
    singleFrameKeys[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", function (e) {
    keys[e.key.toLowerCase()] = false;
    singleFrameKeys[e.key.toLowerCase()] = false;
});


//===================================== SETTINGS ===================================

var playerTransform = {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    velocity: [0, 0, 0],
    quatRotation: [0, -1, 0, 0]
};

window.addEventListener("resize", evt => {
    if (!isRendering) {
        raymarcher.setShaderState("resolution", [window.innerWidth * rmSettings.values.resolutionFactor, window.innerHeight * rmSettings.values.resolutionFactor]);
    }
});

//Initialize the stuff
let rmSettings;
let raymarcher;

function initSettingsMenu() {   
    let uiElem = document.getElementById("ui-container");
    let settingsElem = document.getElementById("settings");
    while (settingsElem.children.length > 0) settingsElem.removeChild(settingsElem.lastChild); 
    rmSettings = createRaymarcherSettingsMenu(
    settingsElem,
    uiElem,
    raymarcherSettings,
    (value, setting, isChange) => {
        if (!setting.indirect) {
            if (setting.recompile) {
                if (isChange) {
                    raymarcher.setShaderState(setting.id, value);
                }
            } else {
                raymarcher.setShaderState(setting.id, value);
            }
        }
    }
);
}

let tiledRenderer;

async function init() {

    createUITabs(document.getElementById("tab-switcher"), uiTabs);
    
    raymarcher = new Raymarcher(createCanvasGraphicsInterface(c));
    raymarcher.setShaderState("resolution", [window.innerWidth, window.innerHeight]);
    await raymarcher.init();
    //while (uiElem.h) uiElem.removeChild(uiElem.lastChild);
    initSettingsMenu();

    //===================================== SDF EDITOR STUFF =====================================
    let sdfTextarea = CodeMirror.fromTextArea(document.getElementById("shader-input"));
    let changeSDF = () => {
        raymarcher.setShaderState("signedDistanceFunction", sdfTextarea.getValue());
        raymarcher.resetShaderStateInfo();
        let uiObject = getUIComment(sdfTextarea.getValue());
        if (uiObject.settings) {
            raymarcherSettings["Shader Controls"] = uiObject;
            uiObject.settings.forEach(setting => {
                raymarcher.registerShaderState(setting.id, { uniform: true, uniformType: setting.uniformType || "1f" });
            });
        } else {
            delete raymarcherSettings["Shader Controls"];
        }
        initSettingsMenu();
    }

    let updateShaderButton = document.getElementById("update-shader");
    sdfTextarea.setValue((await request("sdfs/default.glsl")).response);
    updateShaderButton.addEventListener("click", () => {
        changeSDF();
    });
    changeSDF();

    let shaderChooser = document.getElementById("choose-shader");


    shaderChooser.addEventListener("change", async () => {
        console.log(shaderChooser.value);
        sdfTextarea.setValue((await request(`sdfs/${shaderChooser.value}`)).response);
        //sdfTextarea.value = (await request(`sdfs/${shaderChooser.value}`)).response;
        changeSDF();
    });

    //======================================== SETTING PRESETS ======================================

    let settingPresetChooser = document.getElementById("setting-presets");
    let applySettingPresetButton = document.getElementById("apply-setting-preset");
    applySettingPresetButton.addEventListener("click", async () => {
        rmSettings.changeSettings(JSON.parse((await request(`setting-presets/${settingPresetChooser.value}`)).response));
    });


    renderDataTransformer = CodeMirror(document.getElementById("renders"), {
        mode: "javascript"
    });
    renderDataTransformer.setValue(((await request("recording-transformers/global-illumination-explanation.js")).response));

    let recordingTransformerChooser = document.getElementById("recording-transformer-presets");
    let applyRecordingTransformerPresetButton = document.getElementById("apply-recording-transformer-preset");
    applyRecordingTransformerPresetButton.addEventListener("click", async () => {
        renderDataTransformer.setValue((await request(`recording-transformers/${recordingTransformerChooser.value}`)).response);
    });



    drawLoop();
}

function addRecording(recording, whereToPutRecordings) {
    let container = document.createElement("div");
    container.className = "single-recording";
    whereToPutRecordings.appendChild(container);

    let recordingTitle = document.createElement("h3");
    recordingTitle.innerText = recording.title;
    container.appendChild(recordingTitle);
    
    let recordingInfo = document.createElement("p");
    recordingInfo.innerText = `Length: ${recording.data.length} frames`;
    container.appendChild(recordingInfo);

    let playRecording = document.createElement("button");
    playRecording.innerText = "Play";
    playRecording.addEventListener("click", () => {
        isDoingPlayback = true;
        recordingToPlay = recording;
        playbackFrame = 0;
    });
    container.appendChild(playRecording);
}

function regenerateRecordingSelector(selectElem, listOfRecordings) {
    deleteAllChildren(selectElem);
    listOfRecordings.forEach(rec => {
        let option = document.createElement("option");
        option.innerText = rec.title;
        option.value = rec.title;

        selectElem.appendChild(option);
    });
}

let recordingSelector = document.getElementById("select-recording");

let renderRecordingButton = document.getElementById("render-recording");
renderRecordingButton.addEventListener("click", async function () {
    isWaitingForRendering = true;
});
let isRendering = false;

let currentRecording = [];
let isRecording = false;
let isWaitingForRendering = false;

let allRecordings = [];

let lightLocation = [0, 0, 0];
//Draw loop
var t = 0;

let viewerStatistics = document.getElementById("statistics");

let prevTime = Date.now();
let avgFPSes = [];

let isDoingPlayback = false;
let recordingToPlay;
let playbackFrame = 0;

let savedViewerRaymarcherState;

async function drawLoop() {
    if (isWaitingForRendering) {
        savedViewerRaymarcherState = raymarcher.getAllShaderState();

        isWaitingForRendering = false;
        isRendering = true;
        tiledRenderer = new TiledRenderer();
        await tiledRenderer.init(raymarcher);
    
        let code = renderDataTransformer.getValue();
    
        let recordingName = recordingSelector.value;
        let recording;
        allRecordings.forEach(rec => {
            if (recordingName == rec.title) recording = JSON.parse(JSON.stringify(rec));
        });
    
        let transformerFunc = new Function("rec", "renderSettings", code);
        let renderSettings = {
            partitions: 4,
            samples: 1,
            url: "http://localhost:42064/test/frame%INDEX%.png"
        };
    
        transformerFunc(recording, renderSettings);
        Raymarcher.removeDuplicateState(recording.data, );
    
        await tiledRenderer.startRender(recording.data, renderSettings.partitions, renderSettings.samples, renderSettings.url);
    } else if (isRendering) {
        await tiledRenderer.nextFrame();
        if (tiledRenderer.done || keys.x) {
            isRendering = false;
            tiledRenderer.endRender();
            raymarcher.setAllShaderState(savedViewerRaymarcherState, true);
        }


    } else {

        if (keys.x) {
            isDoingPlayback = false;
        }
    
    
        if (isDoingPlayback) {
            if (playbackFrame >= recordingToPlay.data.length) {
                playbackFrame = 0;
            }
            raymarcher.setAllShaderState(recordingToPlay.data[playbackFrame]);
            playbackFrame++;
            raymarcher.renderSingleFrame();
            raymarcher.presentFramebuffer();
        } else {
                
            raymarcher.setShaderState("uPrevPos", playerTransform.position);
            raymarcher.setShaderState("uPrevRot", playerTransform.quatRotation);
            t++;
            var acceleration = [0, 0, 0]
            
            let xRotation = quatAngleAxis(playerTransform.rotation[0] * -rmSettings.values.cameraAccel, vectorQuaternionMultiply(playerTransform.quatRotation, [0, 0, 1]));
            let yRotation = quatAngleAxis(playerTransform.rotation[1] * -rmSettings.values.cameraAccel, vectorQuaternionMultiply(playerTransform.quatRotation, [1, 0, 0]));
        
            playerTransform.rotation = scalarMultiply(playerTransform.rotation, rmSettings.values.cameraSmoothness);
        
            playerTransform.quatRotation = quatMultiply(xRotation, playerTransform.quatRotation);
            playerTransform.quatRotation = quatMultiply(yRotation, playerTransform.quatRotation);
            playerTransform.quatRotation = normalize(playerTransform.quatRotation);
        
            if (keys.w) {
                acceleration[1] += 0.01;
            }
            if (keys.a) {
                acceleration[0] += -0.01;
            }
            if (keys.s) {
                acceleration[1] += -0.01;
            }
            if (keys.d) {
                acceleration[0] += 0.01;
            }
            if (keys.shift) {
                acceleration[2] += -0.01;
            }
            if (keys[" "]) {
                acceleration[2] += 0.01;
            }
            if (keys.e || t == 1) {
                lightLocation = playerTransform.position.concat();
                raymarcher.setShaderState("uLambertLightLocation", lightLocation);
                console.log(raymarcher.uLambertLightLocation);
            }
            if (singleFrameKeys.r) {
                isRecording = !isRecording;
                if (!isRecording) {
                    Raymarcher.removeDuplicateState(currentRecording);
                    allRecordings.push({
                        data: currentRecording,
                        title: `recording${allRecordings.length}`
                    });
                    addRecording(allRecordings[allRecordings.length - 1], document.getElementById("recordings"));
                    regenerateRecordingSelector(recordingSelector, allRecordings);
                    currentRecording = [];
                }
            }

            acceleration = acceleration.map(e => { return e * rmSettings.values.playerSpeed; });
    
            acceleration = vectorQuaternionMultiply(playerTransform.quatRotation, acceleration);
            playerTransform.velocity = playerTransform.velocity.map((e, i) => { return e + acceleration[i]; });
            playerTransform.position = playerTransform.position.map((e, i) => { return e + playerTransform.velocity[i]; });
            playerTransform.velocity = playerTransform.velocity.map(e => { return e * rmSettings.values.playerSmoothness; });
    
            raymarcher.setShaderState("uPosition", playerTransform.position);
    
            raymarcher.setShaderState("uTime", t);
    
            //raymarcher.position = playerTransform.position;
            raymarcher.setShaderState("rotation", playerTransform.quatRotation);
    
            // let fractalRotateQuat = [0, 1, 0, 0];
    
            // fractalRotateQuat = quatMultiply(fractalRotateQuat, quatAngleAxis(rmSettings.fractalRotation1, [1, 0, 0]));
            // fractalRotateQuat = quatMultiply(fractalRotateQuat, quatAngleAxis(rmSettings.fractalRotation2, [0, 1, 0]));
            // fractalRotateQuat = quatMultiply(fractalRotateQuat, quatAngleAxis(rmSettings.fractalRotation3, [0, 0, 1]));
    
            // raymarcher.uFractalRotation = fractalRotateQuat;
    
            if (!rmSettings.values.motionBlur) {
                raymarcher.setShaderState("uMotionBlurPrevPos", playerTransform.position);
                raymarcher.setShaderState("uMotionBlurPrevRot", playerTransform.quatRotation);
            }
            await raymarcher.renderSingleFrame();
            raymarcher.presentFramebuffer();
            
            if (rmSettings.values.motionBlur) {
                raymarcher.setShaderState("uMotionBlurPrevPos", playerTransform.position);
                raymarcher.setShaderState("uMotionBlurPrevRot", playerTransform.quatRotation);
            }

        }
        if (isRecording) {
            let shaderState = raymarcher.getAllShaderState();
            currentRecording.push(shaderState);
        };
    
        let now = Date.now();
        let renderTimeInterval = now - prevTime;
        prevTime = now;
    
        let fps = Math.round(1000 / renderTimeInterval * 10) / 10;
        avgFPSes.push(fps);
        if (avgFPSes.length > 10) {
            avgFPSes.splice(0, 1);
        }
    
        let averageFPS = Math.round(avgFPSes.reduce((prev, cur) => prev + cur, 0) / avgFPSes.length * 10) / 10;
    
        viewerStatistics.innerHTML = 
            `FPS: ${fps}`.padEnd(15, "\xa0") + 
            `Average FPS (last 10 frames): ${averageFPS}`.padEnd(40, "\xa0") + 
            (isRecording ? 
                `<span style="color:red">RECORDING (${currentRecording.length} Frames)</span>` : 
                (isDoingPlayback ? `<span style="color: #FFFF00">PLAYING ${recordingToPlay.title} (Frame ${playbackFrame})</span>` : `<span style="color: #00FF00">NOT RECORDING</span>`));
    
        singleFrameKeys = {};    
    }
    requestAnimationFrame(drawLoop);
}

init();