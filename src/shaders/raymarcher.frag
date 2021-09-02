#version 300 es

//REPLACEHERE

#ifdef GL_ES
    precision highp float;
#endif

//#define DIFFUSE
//#define ADDITIVE

//============================== UNIFORMS =============================

uniform vec3 uPosition;
uniform float uTime;
uniform float uNoiseSeed;
uniform vec3 uLambertLightLocation;
uniform vec4 rotation;
uniform vec2 uViewportSize;
uniform float uFOV;
uniform float uShadowBrightness;
uniform float uRayHitThreshold;
uniform float uAOStrength;

uniform sampler2D uPrevFrame;
uniform sampler2D img;
uniform sampler2D uPrevFrameSamplesRendered;
uniform sampler2D uPrevFrameSubpixelOffsetsUnsigned;

uniform float uBlendFactor;

uniform float uDOFStrength;
uniform float uFocalPlaneDistance;

uniform float uShadowSoftness;
uniform float uLightStrength;

uniform vec3 uMotionBlurPrevPos;
uniform vec4 uMotionBlurPrevRot;

uniform vec3 uPrevPos;
uniform vec4 uPrevRot;

uniform float uTimeMotionBlurFactor;

uniform float uNormalDelta;

uniform int uReprojectionExtraSamples;

uniform int uStrobe;

uniform float uReprojectionEdgeThreshold;
uniform float uReprojectionAccumulationLimit;

in highp vec2 vTexCoord; 
layout(location = 0) out vec4 fragColor;
layout(location = 1) out float sampleCount;
layout(location = 2) out vec3 outNormal;
layout(location = 3) out vec3 outAlbedo;
layout(location = 4) out vec2 outSubpixelOffset;

vec3 uLambertLightLocation2;

//============================================= MACROS (PSEUDO-UNIFORMS) ============================

#define ITERATIONS 8.0

#define STEPS 0
#define NORMALSTEPS 0
#define TRANSMISSIONSTEPS 32

#define REFLECTIONS 1

#define TRANSMISSIONRAYS 2

#define SAMPLESPERFRAME 1


//========================================== RAYMARCHING "LIBRARY" =======================================

struct Material {
    vec3 color;
    float roughness;
    bool metallic;
    bool background;
};

//=========================================== HASH, SAMPLING, AND RANDOM =======================================

uint hash( uint x ) {
    x += ( x << 10u );
    x ^= ( x >>  6u );
    x += ( x <<  3u );
    x ^= ( x >> 11u );
    x += ( x << 15u );
    return x;
}
uint hash( uvec2 v ) { return hash( v.x ^ hash(v.y)                         ); }
float floatConstruct( uint m ) {
    const uint ieeeMantissa = 0x007FFFFFu; // binary32 mantissa bitmask
    const uint ieeeOne      = 0x3F800000u; // 1.0 in IEEE binary32

    m &= ieeeMantissa;                     // Keep only mantissa bits (fractional part)
    m |= ieeeOne;                          // Add fractional part to 1.0

    float  f = uintBitsToFloat( m );       // Range [1:2]
    return f - 1.0;                        // Range [0:1]
}
float rand( vec2  v ) { return floatConstruct(hash(floatBitsToUint(v))); }

vec2 seed;
float rand() {
    seed += vec2(0.239482);
    return rand(seed);
}
vec2 seed2;
float rand2() {
    seed2 += vec2(1.0);
    return rand(seed2);
}

const float tau = 6.28318531;
vec2 boxMuller(float a, float b) {
    return vec2(
        cos(tau * b),
        sin(tau * b)
    ) * sqrt(-2.0 * log(a));
}

vec3 hemisphericalSample(vec3 normal) {
    vec3 randomSample = vec3(boxMuller(rand(), rand()), boxMuller(rand(), rand()).x);
    return randomSample * sign(dot(normal, randomSample));
}


//====================================== LENGTH SQUARED TEMPLATE ======================================

#define makeLength2(type) float length2(type v) { return dot(v, v); }

float distance2(vec3 a, vec3 b) {
    vec3 diff = a - b;
    return dot(diff, diff);
}

makeLength2(vec2)


//===================================== QUATERNIONS ===========================================

vec3 rotateQuat(vec3 position, vec4 q)
{ 
  vec3 v = position.xyz;
  return v + 2.0 * cross(q.yzw, cross(q.yzw, v) + q.x * v);
}

vec4 quatAngleAxis(float angle, vec3 axis) {
    return vec4(cos(angle), axis * sin(angle));
}

vec4 quatInverse(vec4 q) {
    vec4 conj;
    conj.yzwx = vec4(-q.yzw, q.x);
    return conj / dot(q, q);
}

float time;

//======================================= SIGNED DISTANCE FUNCTIONS ==================================

//SDF_START
float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic, out bool background) {
    vec3 d = abs(mod(position, 2.0) - vec3(1.0)) - vec3(0.5);
    return min(max(d.x,max(d.y,d.z)),0.0) +
         length(max(d,0.0));
}
//SDF_END

float globalSDF(vec3 position, out vec3 color) {
    float dummyRoughness;
    bool dummyMetallic;
    bool dummyBackground;
    return globalSDF(position, color, dummyRoughness, dummyMetallic, dummyBackground);
}

float globalSDF(vec3 position) {
    vec3 dummyColor;
    return globalSDF(position, dummyColor);
}

//============================================ RAY MARCHING =======================================

//march a single ray
vec3 marchCameraRay(vec3 origin, vec3 direction, out float finalMinDist, out int stepsBeforeThreshold, out vec3 color, out float roughness, out bool metallic, out bool background) {
	vec3 directionNormalized = normalize(direction);
	vec3 position = origin;
	float minDist = 0.0;
    float totalDist = 0.0;
	for (int i = 0; i < STEPS; i++) {
		minDist = globalSDF(position);
        totalDist += minDist;
		position += directionNormalized * minDist;
		if (minDist < uRayHitThreshold * totalDist) {
			stepsBeforeThreshold = i;
            break;
		}
	}
    globalSDF(position, color, roughness, metallic, background);
	finalMinDist = minDist;
	return position;
}

//march a ray used for finding normals
vec3 marchNormalFindingRay(vec3 origin, vec3 direction) {
    vec3 directionNormalized = normalize(direction);
	vec3 position = origin;
	float minDist = 0.0;
	for (int i = 0; i < NORMALSTEPS; i++) {
		minDist = globalSDF(position);
		position += directionNormalized * minDist;
	}
	return position;
}

vec3 marchTransmissionRay(vec3 origin, vec3 direction) {
    vec3 directionNormalized = normalize(direction);
	vec3 position = origin;
	float minDist = 0.0;
	for (int i = 0; i < TRANSMISSIONSTEPS; i++) {
		minDist = globalSDF(position);
		position += directionNormalized * minDist;
	}
	return position;
}

//march a ray intended for shadows
vec3 marchShadowRay(vec3 origin, vec3 direction, out float finalMinDist, out int stepsBeforeThreshold) {
	vec3 directionNormalized = normalize(direction);
	vec3 position = origin;
	float minDist = 0.0;
	for (int i = 0; i < STEPS; i++) {
		minDist = globalSDF(position);
		position += directionNormalized * minDist;
		if (minDist < uRayHitThreshold || sign(position.x - uLambertLightLocation2.x) != sign(origin.x - uLambertLightLocation2.x)) {
			stepsBeforeThreshold = i;
            break;
		}
	}
	finalMinDist = minDist;
	return position;
}

vec3 marchRayTrio(vec3 coords, vec3 direction, out float finalMinDist, out int stepsBeforeThreshold, out vec3 normal, out vec3 color, out float roughness, out bool metallic, out bool background) {
	vec3 dist = marchCameraRay(coords, direction, finalMinDist, stepsBeforeThreshold, color, roughness, metallic, background);
    vec3 dirNormal1 = normalize(cross(direction, vec3(boxMuller(rand(), rand()), boxMuller(rand(), rand()).x)));
    vec3 dirNormal2 = normalize(cross(direction, dirNormal1));
    vec3 nDistX = marchNormalFindingRay(dist + dirNormal1 * uNormalDelta, direction);
    vec3 nDistY = marchNormalFindingRay(dist + dirNormal2 * uNormalDelta, direction);
    normal = -normalize(cross(dist - nDistX, dist - nDistY));
    return dist;
}

//========================================== LIGHTS AND COLOR =====================================

//lambertian diffuse shading
vec3 lambertShading(vec3 color, vec3 normal, vec3 light) {
	vec3 lightNormalized = normalize(light);
	float lightIntensity = max(0.0, dot(normal, lightNormalized)) / dot(light, light);
	return color * lightIntensity * uLightStrength;
}

bool didRayReachLight(vec3 position, vec3 shadowPosition) {
    return sign(shadowPosition.x - uLambertLightLocation2.x) != sign(position.x - uLambertLightLocation2.x);
}

vec3 getColor(vec3 position, vec3 normal, int steps, vec3 baseColor, bool reachedLight) {
    float colorFactor;
    
	if (reachedLight) {
        colorFactor = mix(uShadowBrightness, 1.0, lambertShading(vec3(1.0), normal, uLambertLightLocation2 - position).x);//;
	} else {
        colorFactor = uShadowBrightness;
	}

    return baseColor * (1.0 - float(steps) / float(STEPS) * uAOStrength) * colorFactor;
}

//========================================== INDIVIDUAL SAMPLE CALCULATION ===========================

float biasToCenter(float x) {
    return 4.0 * pow(x - 0.5, 2.0) * sign(x - 0.5);
}

void doSample(out vec3 outColor, out vec3 primaryRayHit, int reflections, out vec3 normalOutput, out vec3 albedoOutput) {

    vec3 albedo = vec3(1.0);

    time = uTime + biasToCenter(rand()) * uTimeMotionBlurFactor;

    vec3 coords = gl_FragCoord.xyz / (uViewportSize.y) - vec3(uViewportSize.x / uViewportSize.y * 0.5, 0.5, 0.0);
    vec2 texCoords = coords.xy;
    coords.x *= 1.5 * uFOV;
    coords.y *= 1.5 * uFOV;
    
#ifdef REPROJECT
    vec2 cameraNoiseVecs = (vec2(
        rand(),
        rand()
    ) - vec2(0.5)) / uViewportSize * 0.0 * uFOV;
#else
    vec2 cameraNoiseVecs = (vec2(
        rand(),
        rand()
    ) - vec2(0.5)) / uViewportSize * 1.5 * uFOV;
#endif

    vec3 noiseVec3 = vec3(
        rand(),
        rand(),
        rand()
    ) - vec3(0.5);

    vec3 cameraPosVecs = noiseVec3 * uDOFStrength;

    uLambertLightLocation2 = uLambertLightLocation + noiseVec3 * uShadowSoftness;

    vec3 rayStartPos = mix(uPosition, uMotionBlurPrevPos, noiseVec3.x) + cameraPosVecs;
    vec3 cameraRayGoal = rotateQuat(vec3(coords.x + cameraNoiseVecs.x, 1.0, coords.y + cameraNoiseVecs.y), mix(rotation, uMotionBlurPrevRot, noiseVec3.y)) * uFocalPlaneDistance;

    vec3 cameraRay = normalize(cameraRayGoal - cameraPosVecs);

    for (int i = 0; i < reflections; i++) {

        float distToSurface = 0.0;
        int steps1 = STEPS;
        vec3 normal;
        vec3 color;
        float roughness;
        bool metallic;
        bool background;
        vec3 rayHit = marchRayTrio(rayStartPos, cameraRay, distToSurface, steps1, normal, color, roughness, metallic, background);
        
        float shadowDistToSurface = 0.0;
        int shadowSteps = 0;
        
#ifdef USE_POINT_LIGHT_SOURCE
        vec3 shadowRayHit1 = marchShadowRay(rayHit + (uLambertLightLocation2 - rayHit) * uRayHitThreshold * 10.0, (uLambertLightLocation2 - rayHit), shadowDistToSurface, shadowSteps);
#endif

        if (background) {
            outColor += color * albedo;
        } else {
#ifdef USE_POINT_LIGHT_SOURCE
            bool reachedLight = didRayReachLight(rayHit, shadowRayHit1);
#else
            bool reachedLight = false;
#endif
            outColor += getColor(rayHit, normal, steps1, color, reachedLight) * albedo;
            albedo *= color;
        }
        if (i == 0) {
            normalOutput = normal * 0.5 + 0.5;
            albedoOutput = color;
        }

        vec3 reflectVec = reflect(cameraRay, normal);


        for (int j = 0; j < TRANSMISSIONRAYS; j++) {
            float randSample = rand();
            vec3 transmissionSample = mix(rayHit, rayStartPos, randSample);
            vec3 dirToLight = uLambertLightLocation2 - transmissionSample;
            vec3 transmissionRayHit = marchTransmissionRay(transmissionSample, dirToLight);
            if (sign(transmissionRayHit.x - uLambertLightLocation2.x) != sign(transmissionSample.x - transmissionRayHit.x)) outColor += vec3(0.05, 0.03, 0.01) / float(TRANSMISSIONRAYS);
        }


        float floati = float(i + 1);

        vec3 noise = (vec3(
            rand(),
            rand(),
            rand()
        ) - vec3(0.5)) * roughness;

        rayStartPos = rayHit + reflectVec * uRayHitThreshold * 15.0;
        if (metallic) {
            cameraRay = reflectVec + noise;
        } else {
            cameraRay = hemisphericalSample(normal);
        }

        if (i == 0) primaryRayHit = rayHit;
        if (background) break;
    }
}

//============================================== MAIN FUNCTION =====================================

void main() {

    vec3 outColor = vec3(0.0);
    seed = vTexCoord + vec2(uNoiseSeed);

    vec3 primaryRayHit;

    bool shouldSample = int(rand(floor(gl_FragCoord.xy / 16.0 + uTime * 24.0)) * float(uStrobe)) == 0;

    if (shouldSample) {
        for (int samples = 0; samples < int(SAMPLESPERFRAME); samples++) {
            doSample(outColor, primaryRayHit, REFLECTIONS, outNormal, outAlbedo);
        }
    } else {
        vec3 dummy;
        doSample(outColor, primaryRayHit, 1, dummy, dummy);
    }

    vec4 lastFrameSample; 

    bool shouldResample = false;
#ifdef REPROJECT
    vec3 pixelAtLastFrame = rotateQuat((primaryRayHit - uPrevPos), quatInverse(uPrevRot));
    vec2 reprojectedTexCoordsCenter = ((pixelAtLastFrame.xz / pixelAtLastFrame.y) / (uFOV * 1.5) * vec2(uViewportSize.y / uViewportSize.x, 1.0)) + vec2(0.5);


    reprojectedTexCoordsCenter += (vec2(rand(), rand()) - 0.5) / uViewportSize * 0.0;
    vec2 prevFrameSubpixelOffsets = (texture(uPrevFrameSubpixelOffsetsUnsigned, reprojectedTexCoordsCenter).xy);
    //reprojectedTexCoordsCenter = (floor(reprojectedTexCoordsCenter * uViewportSize) + 0.5) / uViewportSize;
    //vec2 originalReprojectedTexCoords = reprojectedTexCoordsCenter;
    reprojectedTexCoordsCenter += prevFrameSubpixelOffsets;
    //reprojectedTexCoordsCenter = vTexCoord + (floor((reprojectedTexCoordsCenter - vTexCoord) * uViewportSize + 0.5)) / uViewportSize + prevFrameSubpixelOffsets;
    
    //vec2 fractReprojectedTexCoords = fract(reprojectedTexCoordsCenter * uViewportSize) / uViewportSize;

    //reprojectedTexCoords += (vec2(pow(fractReprojectedTexCoords.x - 0.5, 2.0), pow(fractReprojectedTexCoords.y - 0.5, 2.0)) * sign(fractReprojectedTexCoords - 0.5) - fractReprojectedTexCoords) / uViewportSize;

    vec2 texOffset;

    float minDistanceError = 9999999.9;

    vec2 reprojectedTexCoords = reprojectedTexCoordsCenter;

    lastFrameSample = texture(uPrevFrame, reprojectedTexCoordsCenter);
    
    if (abs(lastFrameSample.a - length(pixelAtLastFrame)) / length(pixelAtLastFrame) > uReprojectionEdgeThreshold) {
        for (texOffset.y = -1.0; texOffset.y < 1.5; texOffset.y++) {
            for (texOffset.x = -1.0; texOffset.x < 1.5; texOffset.x++) {
                vec2 actualReprojectedTexCoords = reprojectedTexCoordsCenter + texOffset / uViewportSize;
                vec4 potentialLastFrameSample = texture(uPrevFrame, actualReprojectedTexCoords);
                float distanceError = abs(potentialLastFrameSample.a - length(pixelAtLastFrame)) / length(pixelAtLastFrame);
                if (minDistanceError > distanceError) {
                    minDistanceError = distanceError;
                    lastFrameSample = potentialLastFrameSample;
                    reprojectedTexCoords = actualReprojectedTexCoords;
                }
            }   
        } 
    }

    outSubpixelOffset = (mod((reprojectedTexCoords - vTexCoord) * uViewportSize + 0.5, 1.0) - 0.5) / uViewportSize;// + prevFrameSubpixelOffsets * uViewportSize;

    float prevSampleCount = texture(uPrevFrameSamplesRendered, reprojectedTexCoords).r;

    //gl_FragCoord.xyz / (uViewportSize.y) - vec3(uViewportSize.x / uViewportSize.y * 0.5, 0.5, 0.0);
    if (clamp(reprojectedTexCoords, 0.001, 0.999) == reprojectedTexCoords) {
        //lastFrameSample = texture(uPrevFrame, reprojectedTexCoords);
        if (abs(lastFrameSample.a - length(pixelAtLastFrame)) / length(pixelAtLastFrame) > uReprojectionEdgeThreshold) {
            lastFrameSample = vec4(outColor, 1.0);
            shouldResample = true;
            sampleCount = 0.0;
        }
    } else {
        lastFrameSample = vec4(outColor, 1.0);
        shouldResample = true;
        sampleCount = 0.0;
    }
    if (!shouldResample) {
        sampleCount = prevSampleCount + 1.0;
    } else {
        sampleCount = 1.0;
    }
#else
    lastFrameSample = texture(uPrevFrame, vTexCoord);
    sampleCount = 1.0;
    outSubpixelOffset = vec2(0.0);
#endif

    float colorDivideFactor = float(REFLECTIONS * SAMPLESPERFRAME);

#ifdef REPROJECT
    if (prevSampleCount < 8.0) {
        for (int i = 0; i < uReprojectionExtraSamples; i++) {
            vec3 dummy;
            doSample(outColor, primaryRayHit, REFLECTIONS, dummy, dummy);
        }
        colorDivideFactor += float(REFLECTIONS * uReprojectionExtraSamples);
    }
#endif
    outColor /= colorDivideFactor;

    if (shouldSample) {
#ifdef REPROJECT
        float lengthFactor = (lastFrameSample.a - distance(uPosition, primaryRayHit)) / lastFrameSample.a;
        fragColor = mix(vec4(lastFrameSample.rgb, 1.0), vec4(outColor, 1.0), clamp(max(1.0 / (sampleCount - 1.0), 1.0 / uReprojectionAccumulationLimit) + lengthFactor, 0.0, 1.0));
#else
#ifdef ADDITIVE
        fragColor = vec4(outColor, 1.0) * uBlendFactor + vec4(lastFrameSample.rgb, 1.0);//vec4(outColor * (1.0 - float(steps1) / float(STEPS)) * colorFactor, 1.0);
#else
        fragColor = mix(vec4(outColor, 1.0), vec4(lastFrameSample.rgb, 1.0), uBlendFactor);
#endif
#endif

    } else {
        fragColor = vec4(lastFrameSample.rgb, 1.0);
    }

    fragColor.a = distance(uPosition, primaryRayHit);
    fragColor.rgb = max(fragColor.rgb, 0.0);

#ifdef RESET
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
#endif

}