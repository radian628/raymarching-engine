
//=============================== LINEAR ALGEBRA =================================
function matMultiply(vec, mat) {
    return [
        vec[0] * mat[0] + vec[1] * mat[3] + vec[2] * mat[6],
        vec[0] * mat[1] + vec[1] * mat[4] + vec[2] * mat[7],
        vec[0] * mat[2] + vec[1] * mat[5] + vec[2] * mat[8]
    ];
}

function matMultiplyMat(mat1, mat2) {
    return [
        dotProduct([mat1[0], mat1[1], mat1[2]], [mat2[0], mat2[3], mat2[6]]), dotProduct([mat1[0], mat1[1], mat1[2]], [mat2[1], mat2[4], mat2[7]]), dotProduct([mat1[0], mat1[1], mat1[2]], [mat2[2], mat2[5], mat2[8]]),
        dotProduct([mat1[3], mat1[4], mat1[5]], [mat2[0], mat2[3], mat2[6]]), dotProduct([mat1[3], mat1[4], mat1[5]], [mat2[1], mat2[4], mat2[7]]), dotProduct([mat1[3], mat1[4], mat1[5]], [mat2[2], mat2[5], mat2[8]]),
        dotProduct([mat1[6], mat1[7], mat1[8]], [mat2[0], mat2[3], mat2[6]]), dotProduct([mat1[6], mat1[7], mat1[8]], [mat2[1], mat2[4], mat2[7]]), dotProduct([mat1[6], mat1[7], mat1[8]], [mat2[2], mat2[5], mat2[8]]),
    ]
}

function rotateX(angle) {
    return [
        1, 0, 0,
        0, Math.cos(angle), -Math.sin(angle),
        0, Math.sin(angle), Math.cos(angle)
    ];
}

function rotateY(angle) {
    return [
        Math.cos(angle), 0, Math.sin(angle),
        0, 1, 0,
        -Math.sin(angle), 0, Math.cos(angle)
    ];
}

function rotateZ(angle) {
    return [
        Math.cos(angle), -Math.sin(angle), 0,
        Math.sin(angle), Math.cos(angle), 0,
        0, 0, 1
    ];
}

function getValue(elemID) {
    return Number(document.getElementById(elemID).value);
}

function vectorAdd(v1, v2) {
    return v1.map((e, i) => { return e + v2[i]; });
}

function dotProduct(v1, v2) {
    var sum = 0;
    for (var i = 0; v1.length > i; i++) {
        sum += v1[i] * v2[i];
    }
    return sum;
}

function crossProduct(v1, v2) {
    return [
        v1[1] * v2[2] - v1[2] * v2[1],
        v1[2] * v2[0] - v1[0] * v2[2],
        v1[0] * v2[1] - v1[1] * v2[0]
    ]
}

function norm(v) {
    return v.reduce((acc, cur) => { return acc + cur * cur }, 0);
}

function normalize(v) {
    return scalarDivide(v, Math.hypot(...v));
}

function scalarMultiply(v, s) {
    return v.map(e => { return e * s });
}

function scalarDivide(v, s) {
    return v.map(e => { return e / s });
}

function quatConjugate(q) {
    return [q[0], -q[1], -q[2], -q[3]];
}

function quatInverse(q) {
    return scalarDivide(quatConjugate(q), norm(q));
}

function quatMultiply(q1, q2) {
    var w1 = q1[0];
    var w2 = q2[0];
    var v1 = [q1[1], q1[2], q1[3]];
    var v2 = [q2[1], q2[2], q2[3]];
    return [w1 * w2 - dotProduct(v1, v2), ...vectorAdd(vectorAdd(crossProduct(v1, v2), scalarMultiply(v2, w1)), scalarMultiply(v1, w2))]
}

function quatAngleAxis(angle, axis) {
    return [Math.cos(angle / 2), ...scalarMultiply(axis, Math.sin(angle / 2))];
}

function vectorQuaternionMultiply(q, v) {
    let qi = [q[1], q[2], q[3]];
    return vectorAdd(v, crossProduct(qi, vectorAdd(crossProduct(qi, v), v.map(comp => comp * q[0]))).map(comp => comp * 2));
}

function quatToMatrix(q) {
    var w = q[0];
    var x = q[1];
    var y = q[2];
    var z = q[3];

    var w2 = w * w;
    var x2 = x * x;
    var y2 = y * y;
    var z2 = z * z;
    
    var wx = w * x;
    var wy = w * y;
    var wz = w * z;
    
    var xy = x * y;
    var xz = x * z;

    var yz = y * z;

    return [
        1 - 2 * y2 - 2 * z2, 2 * xy - 2 * wz, 2 * xz + 2 * wy,
        2 * xy + 2 * wz, 1 - 2 * x2 - 2 * z2, 2 * yz - 2 * wx,
        2 * xz - 2 * wy, 2 * yz + 2 * wx, 1 - 2 * x2 - 2 * y2
    ];
}

function matrixTranspose(m) {
    return [
        m[0], m[3], m[6],
        m[1], m[4], m[7],
        m[2], m[5], m[8]
    ];
}

function quatToEuler(q) {
    return [
        Math.atan2(2*q[2] * q[0] - 2 * q[1] * q[3], 1 - 2 * q[2] * q[2] - 2 * q[3] * q[3]),
        Math.asin(2 * q[1] * q[2] + 2 * q[3] * q[0]),
        Math.atan2(2*q[1] * q[0] - 2 * q[2] * q[3], 1 - 2 * q[1] * q[1] - 2 * q[3] * q[3])
    ]
}

//====================== GENERAL UTIL ==========================

function replaceMacro(source, macroName, value) {
    return source.replace(`#define ${macroName}`, `#define ${macroName} ${value} //`);
}

function compileShader(gl, shaderCode, type) {
	var shader = gl.createShader(type);
    
    gl.shaderSource(shader, shaderCode);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(`Error compiling ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader:`);
        console.log(gl.getShaderInfoLog(shader));
    }
    return shader;
}

//Builds the shader program.
function buildShaderProgram(gl, vert, frag) {
    
    var shaderProgram = gl.createProgram();
    
    gl.attachShader(shaderProgram, compileShader(gl, vert, gl.VERTEX_SHADER));
    
    gl.attachShader(shaderProgram, compileShader(gl, frag, gl.FRAGMENT_SHADER));
    
    gl.linkProgram(shaderProgram);

    return shaderProgram;
}

//xmlhttprequest promise (haha this is just a crappy fetch api lmao)
async function request(text) {
    var req = new XMLHttpRequest();
    var returnPromise = new Promise((resolve, reject) => {
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    resolve(req);
                }
            }
        }
    });
    req.open("GET", text);
    req.send();
    return returnPromise;
}


function hex2rgb(hex) {
    return [
        parseInt(hex.substring(1, 3), 16),
        parseInt(hex.substring(3, 5), 16),
        parseInt(hex.substring(5, 7), 16)
    ];
}

function createTexture(gl) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return texture;
}

function createAndAddToTexture(gl, image) {
    let texture = createTexture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    return texture;
}

function vequals(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        let equal = true;
        a.forEach((e, i) => {
            if (e != b[i]) equal = false;
        });
        return equal;
    } else {
        return a == b;
    }
}

function copyArray(obj) {
    if (Array.isArray(obj) || typeof obj == "string") {
        return obj.concat();
    }
    return obj;
}



function createCanvasGraphicsInterface(canvas) {
    let gi = {
        gl: canvas.getContext("webgl2", { antialias: 0, preserveDrawingBuffer: true }),
        surface: {
            get width () {
                return canvas.width;
            },
            set width (width) {
                canvas.width = width;
            },
            
            get height () {
                return canvas.height;
            },
            set height (height) {
                canvas.height = height;
            }
        }
    };
    console.log(gi);
    return gi;
}


class Raymarcher {
    constructor(graphicsInterface) {
        this.surface = graphicsInterface.surface;
        this.gl = graphicsInterface.gl;
        this.gl.getExtension("EXT_color_buffer_float");

        this.recompileNextFrame = false;
        this.recreateFramebuffers = false;

        this.updateDisplay = true;

        this.resetState = 0;
        this.t = 0;

        this.shaderState = {
            uPosition: [0, 0, 0],
            raymarchingSteps: 32,
            normalRaymarchingSteps: 8,
            reflections: 1,
            transmissionRaymarchingSteps: 16,
            transmissionRayCount: 0,
            samplesPerFrame: 1
        };
        this.shaderStateInfo = {
            uPosition: { uniform: true, uniformType: "3fv" },
            rotation: { uniform: true, uniformType: "4fv" },
            uMotionBlurPrevPos: { uniform: true, uniformType: "3fv" },
            uMotionBlurPrevRot: { uniform: true, uniformType: "4fv" },
            uShadowBrightness: { uniform: true, uniformType: "1f" },
            uAOStrength: { uniform: true, uniformType: "1f" },
            uShadowSoftness: { uniform: true, uniformType: "1f" },
            uLightStrength: { uniform: true, uniformType: "1f" },
            uRayHitThreshold: { uniform: true, uniformType: "1f" },
            uBlendFactor: { uniform: true, uniformType: "1f" },
            uFOV: { uniform: true, uniformType: "1f" },
            uDOFStrength: { uniform: true, uniformType: "1f" },
            uFocalPlaneDistance: { uniform: true, uniformType: "1f" },
            uLambertLightLocation: { uniform: true, uniformType: "3fv" },
            uTimeMotionBlurFactor: { uniform: true, uniformType: "1f" },

            raymarchingSteps: { recompile: true },
            normalRaymarchingSteps: { recompile: true },
            reflections: { recompile: true },
            transmissionRaymarchingSteps: { recompile: true },
            transmissionRayCount: { recompile: true },
            samplesPerFrame: { recompile: true },
            additiveBlending: { recompile: true },
            signedDistanceFunction: { recompile: true },
            resolution: { recompile: true, resize: true }
        };
        this.defaultShaderStateInfo = JSON.parse(JSON.stringify(this.shaderStateInfo));
    }

    resetShaderStateInfo() {
        this.shaderStateInfo = JSON.parse(JSON.stringify(this.defaultShaderStateInfo));
    }

    registerShaderState(k, v) {
        this.shaderStateInfo[k] = v;
    }

    setShaderState(k, v) {
        let info = this.shaderStateInfo[k];

        if (!info) throw new Error(`Invalid shader state parameter: ${k}`);

        if (info.recompile) {
            this.recompileNextFrame = true;
        }

        if (info.resize) {
            this.recreateFramebuffers = true;
        }

        this.shaderState[k] = v;
    }

    setAllShaderState (state) {
        //Object.assign(this, state);
        Object.keys(state).forEach(key => {
            setShaderState(key, state[key]);
        })
    }

    getAllShaderState () {
        let state = {};
        Object.keys(this.shaderState).forEach(key => {
            state[key] = copyArray(this.shaderState[key]);
        });
        return state;
    }

    removeDuplicateState(shaderStateList) {
        let currentState = {};
        shaderStateList.forEach(shaderState => {
            Object.keys(shaderState).forEach(key => {
                if (shaderState[key] == currentState[key]) {
                    delete shaderState[key];
                } else {
                    currentState[key] = shaderState[key];
                }
            });
        });
    }

    createFramebuffers() {
        let gl = this.gl;
        this.surface.width = this.shaderState.resolution[0];
        this.surface.height = this.shaderState.resolution[1];
        gl.viewport(0, 0, ...this.shaderState.resolution);

        //======= PREVIOUS FRAME =========
        this.prevFrame = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.prevFrame);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA32F, this.surface.width, this.surface.height, 0, gl.RGBA, gl.FLOAT, null
        );

        this.prevFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.prevFramebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.prevFrame, 0
        );



        //======= ANY RANDOM TEXTURE =============
        
        let img = new Image();

        img.onload = () => {
            console.log("got here")
            this.img = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.img);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA, 2048, 2048, 0, gl.RGBA, gl.UNSIGNED_BYTE, img
            );
        }
        img.src = "image.png";
        
        
        //======= CURRENT FRAME =========
        this.currentFrame = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.currentFrame);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA32F, this.surface.width, this.surface.height, 0, gl.RGBA, gl.FLOAT, null
        );

        this.currentFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.currentFramebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.currentFrame, 0
        );
    }

    async init() {
        let gl = this.gl;

        this.createFramebuffers();

        console.log("eeee333");
        await this.recompileShader();
        await this.recompileToneBalanceShader();

        let vertexArray = new Float32Array([
            -1, 1, 1, 1, 1, -1,
            -1, 1, 1, -1, -1, -1
        ]);
        
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
    }

    async recompileToneBalanceShader() {
        var vertShader = (await request("./shaders/vertex.vert")).response;
        var fragShader = (await request("./shaders/tone-balance.frag")).response;
        this.toneBalanceProg = buildShaderProgram(this.gl, vertShader, fragShader);
    }

    async recompileShader() {
        var vertShader = (await request("./shaders/vertex.vert")).response;
        var fragShader = (await request("./shaders/raymarcher.frag")).response;
        fragShader = replaceMacro(fragShader, "STEPS", this.shaderState.raymarchingSteps);
        fragShader = replaceMacro(fragShader, "NORMALSTEPS", this.shaderState.normalRaymarchingSteps);
        fragShader = replaceMacro(fragShader, "REFLECTIONS", this.shaderState.reflections);
        fragShader = replaceMacro(fragShader, "TRANSMISSIONSTEPS", this.shaderState.transmissionRaymarchingSteps);
        fragShader = replaceMacro(fragShader, "TRANSMISSIONRAYS", this.shaderState.transmissionRayCount);
        fragShader = replaceMacro(fragShader, "SAMPLESPERFRAME", this.shaderState.samplesPerFrame);
        let replaceText = "";
        if (this.shaderState.additiveBlending) replaceText = "#define ADDITIVE\n" + replaceText;
        if (this.shaderState.additiveBlending) {
            if (this.resetState == 0) {
                replaceText = "#define RESET\n" + replaceText;
                this.resetState = 1;
                console.log("got here")
            }
        } else {
            this.resetState = 0;
        }
        fragShader = fragShader.replace("//REPLACEHERE", replaceText);

        fragShader = fragShader.replace(/\/\/SDF_START[\s\S]+?\/\/SDF_END/g, this.shaderState.signedDistanceFunction);

        console.log(fragShader);
        this.prog = buildShaderProgram(this.gl, vertShader, fragShader);
        this.gl.finish();
    }

    setUniform(name, type, value) {
        this.gl[`uniform${type}`](this.gl.getUniformLocation(this.prog, name), value);
    }

    async renderSingleFrame() {
        let gl = this.gl;

        if (this.recompileNextFrame) {
            await this.recompileShader();
            this.recompileNextFrame = false;
        }
            
        this.t++;

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.currentFramebuffer);

        gl.useProgram(this.prog);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.prevFrame);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.img);

        gl.uniform1i(gl.getUniformLocation(this.prog, "uPrevFrame"), 0);
        gl.uniform1i(gl.getUniformLocation(this.prog, "img"), 1);
        gl.uniform1f(gl.getUniformLocation(this.prog, "uTime"), this.t);
        // gl.uniform3fv(gl.getUniformLocation(this.prog, "uPosition"), this.shaderState.position);
        // gl.uniform3fv(gl.getUniformLocation(this.prog, "uLambertLightLocation"), this.shaderState.uLambertLightLocation);
        // gl.uniform4fv(gl.getUniformLocation(this.prog, "uRotationQuaternion"), this.shaderState.rotation);
        gl.uniform2fv(gl.getUniformLocation(this.prog, "uViewportSize"), this.shaderState.resolution);
        // gl.uniform1f(gl.getUniformLocation(this.prog, "uFOV"), this.shaderState.uFOV);
        // gl.uniform1f(gl.getUniformLocation(this.prog, "uShadowBrightness"), this.shaderState.uShadowBrightness);
        // gl.uniform1f(gl.getUniformLocation(this.prog, "uHitThreshold"), this.shaderState.uRayHitThreshold);
        // gl.uniform1f(gl.getUniformLocation(this.prog, "uAOStrength"), this.shaderState.uAOStrength);
        // gl.uniform1f(gl.getUniformLocation(this.prog, "uTrail"), this.shaderState.uBlendFactor);

        // gl.uniform1f(gl.getUniformLocation(this.prog, "uDofStrength"), this.shaderState.uDOFStrength);
        // gl.uniform1f(gl.getUniformLocation(this.prog, "uDofDistance"), this.shaderState.uFocalPlaneDistance);

        // gl.uniform1f(gl.getUniformLocation(this.prog, "uSoftShadows"), this.shaderState.uShadowSoftness);
        // gl.uniform1f(gl.getUniformLocation(this.prog, "uLightStrength"), this.shaderState.uLightStrength);

        // gl.uniform3fv(gl.getUniformLocation(this.prog, "uMotionBlurPrevPos"), this.shaderState.uMotionBlurPrevPos);
        // gl.uniform4fv(gl.getUniformLocation(this.prog, "uMotionBlurPrevRot"), this.shaderState.uMotionBlurPrevRot);
        
        let aVertexPosition = gl.getAttribLocation(this.prog, "aVertexPosition");

        //this.setUniform("uTimeMotionBlurFactor", "1f", this.shaderState.uTimeMotionBlurFactor);

        Object.keys(this.shaderStateInfo).forEach(key => {
            let ssi = this.shaderStateInfo[key];
            if (ssi.uniform) {
                this.setUniform(key, ssi.uniformType, this.shaderState[key]);
            }
        }); 

        gl.enableVertexAttribArray(aVertexPosition);
        gl.vertexAttribPointer(aVertexPosition, 2,
            gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);



        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.currentFramebuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.prevFramebuffer);
        gl.blitFramebuffer(0, 0, this.surface.width, this.surface.height, 0, 0, this.surface.width, this.surface.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);


        if (this.resetState == 1) {
            await this.recompileShader();
            this.resetState = 2;
        } else if (this.recompileNextFrame) {
            await this.recompileShader();
            this.recompileNextFrame = false;
        } 
        
        if (this.recreateFramebuffers) {
            this.createFramebuffers();
            this.recreateFramebuffers = false;
        }
        return;
    }

    async presentFramebuffer() {
        let gl = this.gl;
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        
        gl.useProgram(this.toneBalanceProg);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.currentFrame);
        
        let aVertexPosition = gl.getAttribLocation(this.prog, "aVertexPosition");

        gl.enableVertexAttribArray(aVertexPosition);
        gl.vertexAttribPointer(aVertexPosition, 2,
            gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);

    }
}