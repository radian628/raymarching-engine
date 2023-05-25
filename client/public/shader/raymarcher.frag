#version 300 es

precision highp float;


uniform float blendWithPreviousFactor;
uniform sampler2D previousColor;
uniform sampler2D previousNormalAndDofRadius;
uniform sampler2D previousAlbedoAndDepth;
uniform vec2 randNoise;
uniform vec3 position;
uniform mat4 rotation;


uniform float dofAmount;
uniform float dofFocalPlaneDistance;

uniform int cameraMode;
uniform float fov;

uniform float reflections;
uniform float raymarchingSteps;
uniform float indirectLightingRaymarchingSteps;

uniform float aspect;

uniform float fogDensity;

uniform float exposure;

uniform float raymarchingStepCountsArray[10]; 

uniform int blendMode;

uniform int renderMode;

uniform vec3 lightPositions[10];
uniform vec3 lightColors[10];
uniform float lightSizes[10];
uniform int lightCount;

uniform int showDofFocalPlane;

  const float PHI = 1.61803398874989484820459; // Φ = Golden Ratio 

  float gold_noise(in vec2 xy, in float seed)
  {
    return fract(tan(distance(xy*PHI, xy)*seed)*xy.x);
  }


float random (vec2 st) {
    return gold_noise(st, randNoise.x);
    // return fract(sin(dot(st.xy,
    //                      vec2(12.9898,78.233)))*
    //     43758.5453123);
}



vec3 rodrigues(vec3 v, vec3 k, float theta) {
    float cosTheta = cos(theta);
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    return v * cosTheta + cross(k, v) * sinTheta + k * dot(k, v) * (1.0 - cosTheta);
}



in vec2 texcoord;
layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 normalAndDofRadius;
layout(location = 2) out vec4 albedoAndDepth;

float sdfSphere(vec3 position, vec3 center, float radius) {
    return distance(position, center) - radius;
}

float seed = 0.0;
const float PI = 3.141592;
vec2 boxMullerTransform() {
    seed += 0.123123213;
    float u1 = gold_noise(texcoord * 1000.0, fract(randNoise.x + seed));
    seed += 0.123123213;
    float u2 = gold_noise(texcoord * 1000.0, fract(randNoise.y + seed));
    float twoPiU2 = 2.0 * PI * u2;
    return sqrt(-2.0 * log(u1)) * vec2(
        cos(twoPiU2), sin(twoPiU2)
    );
}

float uniformSample() {
    seed += 0.131223;
    return gold_noise(texcoord * 1000.0, fract(randNoise.x + seed));
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


float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
// float sdfFractal(vec3 position) {
//     float subtractedGrid = 9999.9;
//     for (float x = 0.0; x < 9.0; x++) {
//         float sf = pow(0.5, x);
//         subtractedGrid = min(
//             sdfSphere(mod(position, 3.0 * sf) - 1.5 * sf, vec3(0,0,0), 1.09 * sf),
//             subtractedGrid
//         );
//     }
//     return max(
//         sdfSphere(mod(position, 6.0) - 3.0, vec3(0,0,0), 2.7),
//         -subtractedGrid
//     );
// }
float sdfFractal(vec3 position) {
    float dist = sdBox(position + vec3(1.5), vec3(1.5));

    for (float x = -1.0; x < 9.0; x++) {
        float sf = pow(1.0 / 3.0, x);
        dist = max(
            -min(
                sdBox(mod(position + 0.0*sf, 1.0 * sf) - 0.5 * sf, vec3(1.0,3.1,1.0) * sf / 6.0),
                min(
                    sdBox(mod(position + 0.0*sf, 1.0 * sf) - 0.5 * sf, vec3(3.1,1.0,1.0) * sf / 6.0),
                    sdBox(mod(position + 0.0*sf, 1.0 * sf) - 0.5 * sf, vec3(1.0,1.0,3.1) * sf / 6.0)
                )
            ),
            dist
        );
    }
    return dist;
}

//SCENESDFHERE

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
        //if (sdfNow < 0.0001) return rayPosition;
    }
    return rayPosition;
}

float schlick(float cosTheta, float n1, float n2) {
    float r0 = pow((n1 - n2) / (n1 + n2), 2.0);
    return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}


void main(void) {
    // calculate ray position and direction, taking DoF into account
    vec3 rayDirection;
    vec3 rayPosition;
    vec2 randomDirectionOffset = vec2(uniformSample(), uniformSample())
        / vec2(textureSize(previousColor, 0)) * 1.0;
    vec2 texcoord2 = texcoord + randomDirectionOffset;
    float deltaZ = 1.0;
    if (cameraMode == 0) {
        vec3 dofOffset = sphereSample() * dofAmount;
        rayPosition = position + dofOffset;
        vec2 projectionPlanePosition = (texcoord2.xy * 2.0 - 1.0) * vec2(aspect, 1.0) * tan(fov / 2.0);
        vec3 rayDirectionNotNormalized = (rotation * vec4(projectionPlanePosition + randomDirectionOffset, 1.0, 0.0)).xyz;
        vec3 rayDirectionGoal = rayDirectionNotNormalized * dofFocalPlaneDistance;
        deltaZ = 1.0 / length(vec3(projectionPlanePosition, 1.0));
        rayDirection = normalize(rayDirectionGoal - dofOffset);
    } else if (cameraMode == 1) {
        rayDirection = normalize((rotation * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
        rayPosition = position + (rotation * vec4((texcoord2.xy - vec2(0.5)) * vec2(aspect, 1.0) * fov, 0.0, 0.0)).xyz;
    } else if (cameraMode == 2) {
        vec2 angles = (texcoord2 - vec2(0.5, 0.5)) * vec2(2.0 * PI, PI);
        rayDirection = (rotation * vec4(
            cos(angles.x) * cos(angles.y),
            sin(angles.y),
            sin(angles.x) * cos(angles.y), 0.0
        )).xyz;
        rayPosition = position;
    }

    if (renderMode == 1) {    
        float stepsTaken = 0.0;
        float depth = 0.0;
        for (float i = 0.0; i < raymarchingStepCountsArray[0]; i++) {
            float sdfNow = sdf(rayPosition);
            if (sdfNow < 100000000000.0) {
                rayPosition = rayPosition + rayDirection * sdfNow;
                depth += deltaZ * sdfNow;
            }
            if (sdfNow > 0.0001) stepsTaken = i;
        }
        vec3 outColor =(sceneDiffuseColor(rayPosition)
                    + sceneSpecularColor(rayPosition)) * (1.0 - stepsTaken / raymarchingStepCountsArray[0])
                    + sceneEmission(rayPosition);

        vec4 col;

        if (blendMode == 0) {
            col = mix(vec4(outColor, 1.0),
                texture(previousColor, texcoord),
                blendWithPreviousFactor
            );
        } else {
            col = texture(previousColor, texcoord) + vec4(outColor, 0.0) * exposure;
        }

        if (showDofFocalPlane != 0) {
            float focusAmount = abs(depth - dofFocalPlaneDistance) / depth;
            if (focusAmount < dofFocalPlaneDistance * 0.005) {
                fragColor = vec4(1.0, mod(col.yz + vec2(0.5), vec2(1.0)), 1.0);
            } else {
                fragColor = col;
            }
        } else {
            fragColor = col;
        }
        return;
    }

    // parameters that are accumulated across reflections
    vec3 currentAlbedo = vec3(1.0);
    vec3 currentLight = vec3(0.0);
    float probabilityFactor = 1.0;

    // loop over reflections
    for (float i = 0.0; i < reflections; i++) {
        // march ray
        vec3 oldRayPosition = rayPosition;
        rayPosition = castRay(rayPosition, rayDirection, raymarchingStepCountsArray[int(i)]);

        float pathLength = invExpDist(uniformSample(), fogDensity);


        // accumulate light
        currentLight += currentAlbedo * sceneEmission(rayPosition);

        // find normal
        vec3 normal = sceneNormal(rayPosition, 0.00001);

        float subsurfVolumetricSample = -1.0 / sceneSubsurfaceScattering(rayPosition) * log(1.0 - uniformSample());
        vec3 subsurfScatterDirection = normalize(
            mix(rayDirection, normalize(sphereSample()), 1.0)
        );
        subsurfScatterDirection *= -sign(dot(subsurfScatterDirection, normal));
        vec3 subsurfScatterFinalPos = rayPosition + subsurfScatterDirection * subsurfVolumetricSample;
        
        vec3 prevAlbedo = currentAlbedo;
        vec3 diffuseCol = sceneDiffuseColor(rayPosition);
        vec3 specularCol = sceneSpecularColor(rayPosition);
        vec3 prevRayDirection = rayDirection;

        if (distance(oldRayPosition, rayPosition) > pathLength || any(isinf(rayPosition)) || any(isnan(rayPosition))) {
            rayPosition = oldRayPosition + min(pathLength, 1000000.0) * rayDirection;
            rayDirection = sphereSample();
            diffuseCol = vec3(1.0);
            specularCol = vec3(1.0);
            prevRayDirection = rayDirection;
        } else if (sdf(subsurfScatterFinalPos) > 0.001) {

            currentAlbedo *= sceneSubsurfaceScatteringColor(rayPosition);
            rayPosition = subsurfScatterFinalPos;
            rayDirection = normalize(mix(rayDirection, sphereSample(), 1.0));

        } else {

            // get diffuse/specular colors and get probability factor for which one to use
            float diffuseBrightness = length(diffuseCol);
            float specularBrightness = length(specularCol);
            float probFactor = (diffuseBrightness > specularBrightness)
                ? (1.0 - specularBrightness / diffuseBrightness / 2.0)
                : (diffuseBrightness / specularBrightness / 2.0);

            // diffuse reflection
            if (uniformSample() < probFactor) {
                probabilityFactor *= 1.0 - probFactor;
                currentAlbedo *= diffuseCol;
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
                    * clamp(schlick(-dot(rayDirection, normal), 1.0, sceneIOR(rayPosition)), 0.0, 1.0);
                vec3 randVec = sphereSample();
                rayDirection = reflect(rayDirection, normal);
                vec3 axis = normalize(cross(randVec, rayDirection));
                rayDirection = rodrigues(rayDirection, axis, sceneSpecularRoughness(rayPosition) * uniformSample());
            }
                //rayPosition += 0.01 * rayDirection;
        }
        // cast out ray a bit so that it isn't right on the surface of the scene
        rayPosition += rayDirection * 0.001;

        if (i == 0.0) {
            float depth = clamp(distance(rayPosition, position), 0.00001, 100000000.0);

            if (isinf(normal.r) || isnan(normal.r)) normal.r = 0.0;
            if (isinf(normal.g) || isnan(normal.g)) normal.g = 0.0;
            if (isinf(normal.b) || isnan(normal.b)) normal.b = 0.0;

            float dofRadius = clamp(dofAmount * abs(depth - dofFocalPlaneDistance) / depth, 0.0, 1.0);

            if (isinf(dofRadius) || isnan(dofRadius)) dofRadius = 0.0;

            normalAndDofRadius = vec4(
                normal, 
                dofRadius
            ) + texture(previousNormalAndDofRadius, texcoord);
            albedoAndDepth = vec4(currentAlbedo, depth) + texture(previousAlbedoAndDepth, texcoord);
        }

        for (int j = 0; j < lightCount; j++) {
            vec3 lightPosition = lightPositions[j];
            vec3 lightColor = lightColors[j];
            float lightSize = lightSizes[j];

            vec3 adjustedLightPosition = lightPosition + sphereSample() * lightSize;

            vec3 directionToLight = normalize(adjustedLightPosition - rayPosition);
            vec3 result = castRay(rayPosition, directionToLight, raymarchingStepCountsArray[int(i)]);
            if (distance(result, adjustedLightPosition) >= distance(rayPosition, adjustedLightPosition)) {

                float r = max(0.0, dot(directionToLight, reflect(prevRayDirection, normal)));
                float roughness = sceneSpecularRoughness(rayPosition);

                currentLight += 
                    prevAlbedo * diffuseCol * lightColor * max(0.0, dot(directionToLight, normal))
                    + prevAlbedo * specularCol * lightColor * 
                        roughness * roughness / (3.14159265 * pow(r * r * (roughness * roughness - 1.0) + 1.0, 2.0));
            }
        }
    }


    //vec4 currentFragColor = vec4(vec3(dot(normal(rayPosition, 0.0001), normalize(vec3(1.0, 1.0, -1.0)))), 1.0);

    if (blendMode == 0) {
    fragColor = mix(
        vec4(currentLight * exposure, 1.0),
        texture(previousColor, texcoord),
        blendWithPreviousFactor
    );
    } else {
        fragColor = vec4(currentLight * exposure, 1.0) + texture(previousColor, texcoord);
    }
}