#version 300 es

precision highp float;


uniform float blendWithPreviousFactor;
uniform sampler2D previousColor;
uniform vec2 randNoise;
uniform vec3 position;
uniform mat4 rotation;


uniform float dofAmount;
uniform float dofFocalPlaneDistance;


uniform float reflections;
uniform float raymarchingSteps;
uniform float indirectLightingRaymarchingSteps;

uniform float aspect;

uniform float fogDensity;


float random (vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}



vec3 rodrigues(vec3 v, vec3 k, float theta) {
    float cosTheta = cos(theta);
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    return v * cosTheta + cross(k, v) * sinTheta + k * dot(k, v) * (1.0 - cosTheta);
}



in vec2 texcoord;
out vec4 fragColor;

float sdfSphere(vec3 position, vec3 center, float radius) {
    return distance(position, center) - radius;
}

vec2 seed = vec2(0,0);
const float PI = 3.141592;
vec2 boxMullerTransform() {
    seed += vec2(1,1);
    float u1 = random(texcoord + seed + randNoise);
    float u2 = random(texcoord + seed + randNoise + vec2(0.5, 0.3));
    float twoPiU2 = 2.0 * PI * u2;
    return sqrt(-2.0 * log(u1)) * vec2(
        cos(twoPiU2), sin(twoPiU2)
    );
}

vec3 sphereSample() {
    return normalize(vec3(
        boxMullerTransform(),
        boxMullerTransform().x
    ));
}

vec2 circleSample() {
    return normalize(boxMullerTransform());
}

vec3 sceneDiffuseColor(vec3 position) {
    return vec3(mod(position / 6.0 + 3.0, 1.0) * 0.5 + vec3(0.5));
}

vec3 sceneSpecularColor(vec3 position) {
    return vec3(0.8);//vec3(mod(position / 3.0, 1.0) * 0.5 + vec3(0.5)) * 1.0;
}

float sceneSpecularRoughness(vec3 position) {
    return 0.2;
}

float sceneSubsurfaceScattering(vec3 position) {
    return 0.2;
}

float sdfFractal(vec3 position) {
    float subtractedGrid = 9999.9;
    for (float x = 0.0; x < 9.0; x++) {
        float sf = pow(0.5, x);
        subtractedGrid = min(
            sdfSphere(mod(position, 3.0 * sf) - 1.5 * sf, vec3(0,0,0), 1.09 * sf),
            subtractedGrid
        );
    }
    return max(
        sdfSphere(mod(position, 6.0) - 3.0, vec3(0,0,0), 2.7),
        -subtractedGrid
    );
}

vec3 sceneEmission(vec3 position) {
    //float sphere1 = sdfSphere(mod(position, 6.0) - 3.0, vec3(0,0,0), 2.7);
    vec3 idx = floor(position / 6.0);
    return (mod(idx.x + idx.y + idx.z, 30.0) == 0.0) ? vec3(3.0) : vec3(0.0);
}

// scene SDF
float sdf(vec3 position) {
    return sdfFractal(position);
}

float invExpDist(float x, float lambda) {
    return -log(1.0 - x) / lambda;
}

// get normal at position
vec3 sceneNormal(vec3 position, float delta) {
    float sdfAtPos = sdf(position);
    return normalize(vec3(
        sdf(position + vec3(delta, 0, 0)) - sdfAtPos,
        sdf(position + vec3(0, delta, 0)) - sdfAtPos,
        sdf(position + vec3(0, 0, delta)) - sdfAtPos
    ));
}

// ray marching function
vec3 castRay(vec3 rayPosition, vec3 rayDirection, float steps) {
    for (float i = 0.0; i < steps; i++) {
        float sdfNow = sdf(rayPosition);
        rayPosition = rayPosition + rayDirection * sdfNow;
        if (sdfNow < 0.0001) return rayPosition;
    }
    return rayPosition;
}

float schlick(float cosTheta, float n1, float n2) {
    float r0 = pow((n1 - n2) / (n1 + n2), 2.0);
    return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}

void main(void) {
    // calculate ray position and direction, taking DoF into account
    vec3 dofOffset = vec3(
        random(randNoise + texcoord),
        random(randNoise + texcoord * 2.0),
        random(randNoise + texcoord * 3.0)
    ) * dofAmount;
    vec3 rayPosition = position + dofOffset;
    vec2 randomDirectionOffset = vec2(random(randNoise + texcoord.xy), random(randNoise + texcoord.xy * 2.0))
        / vec2(textureSize(previousColor, 0)) * 1.0;
    vec3 rayDirectionNotNormalized = (rotation * vec4((texcoord.xy * 2.0 - 1.0) * vec2(aspect, 1.0) + randomDirectionOffset, 1.0, 0.0)).xyz;
    vec3 rayDirectionGoal = rayDirectionNotNormalized * dofFocalPlaneDistance;
    vec3 rayDirection = normalize(rayDirectionGoal - dofOffset);

    // parameters that are accumulated across reflections
    vec3 currentAlbedo = vec3(1.0);
    vec3 currentLight = vec3(0.0);
    float probabilityFactor = 1.0;

    // loop over reflections
    for (float i = 0.0; i < reflections; i++) {
        // march ray
        vec3 oldRayPosition = rayPosition;
        rayPosition = castRay(rayPosition, rayDirection, (i == 0.0) ? raymarchingSteps : indirectLightingRaymarchingSteps);

        float pathLength = invExpDist(random(rayPosition.yz), fogDensity);

        if (distance(oldRayPosition, rayPosition) > pathLength) {
            rayPosition = oldRayPosition + pathLength * rayDirection;
            rayDirection = sphereSample();
        }

        // accumulate light
        currentLight += currentAlbedo * sceneEmission(rayPosition);
        
        // find normal
        vec3 normal = sceneNormal(rayPosition, 0.0001);

        // get diffuse/specular colors and get probability factor for which one to use
        vec3 diffuseCol = sceneDiffuseColor(rayPosition);
        vec3 specularCol = sceneSpecularColor(rayPosition);
        float diffuseBrightness = length(diffuseCol);
        float specularBrightness = length(specularCol);
        float probFactor = (diffuseBrightness > specularBrightness)
            ? (1.0 - specularBrightness / diffuseBrightness / 2.0)
            : (diffuseBrightness / specularBrightness / 2.0);

        // diffuse reflection
        if (random(rayPosition.xy + randNoise) < probFactor) {
            probabilityFactor *= 1.0 - probFactor;
            currentAlbedo *= diffuseCol;
            rayPosition += 0.01 * rayDirection;
            // for (int j = 0; j < 3; j++) {
            //     vec3 newDir = sphereSample();
            //     rayDirection = newDir;
            //     float pathLength = invExpDist(random(rayPosition.yz), 30.0);
            //     vec3 lastRayPosition = rayPosition;
            //     rayPosition = castRay(rayPosition, rayDirection, 16.0);
            //     if (distance(rayPosition, lastRayPosition) > pathLength) {
            //         rayPosition = lastRayPosition + rayDirection * pathLength;
            //     }
            //     if (sdf(rayPosition) > -0.01) {
            //         rayPosition = rayPosition + 0.02 * sceneNormal(rayPosition, 0.0001);
            //         break;
            //     }
            // }

            vec3 newDir = sphereSample();
            rayDirection = sign(dot(normal, newDir)) * newDir;

        // specular reflection
        } else {
            probabilityFactor *= probFactor;
            currentAlbedo *= specularCol
                * clamp(schlick(-dot(rayDirection, normal), 1.0, 1.5), 0.0, 1.0);
            vec3 randVec = sphereSample();
            rayDirection = reflect(rayDirection, normal);
            vec3 axis = normalize(cross(randVec, rayDirection));
            rayDirection = rodrigues(rayDirection, axis, sceneSpecularRoughness(rayPosition) * random(rayPosition.xy + randNoise * 2.0));
        }

        // cast out ray a bit so that it isn't right on the surface of the scene
        rayPosition += rayDirection * 0.01;
    }


    //vec4 currentFragColor = vec4(vec3(dot(normal(rayPosition, 0.0001), normalize(vec3(1.0, 1.0, -1.0)))), 1.0);
    
    fragColor = mix(
        vec4(currentLight, 1.0),
        texture(previousColor, texcoord),
        blendWithPreviousFactor
    );
}