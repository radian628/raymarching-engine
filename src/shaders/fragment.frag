#version 300 es

//REPLACEHERE

#ifdef GL_ES
    precision highp float;
#endif

//#define DIFFUSE
//#define ADDITIVE

uniform vec3 uPosition;
uniform float uTime;
uniform float uScaleFactor;
uniform vec3 uLambertLightLocation;
uniform vec4 uRotationQuaternion;
uniform vec2 uViewportSize;
uniform float uFOV;
uniform vec3 uFractalColor;
uniform float uShadowBrightness;
uniform float uHitThreshold;
uniform vec4 uIterationRotationQuaternion;
uniform float uRoughness;
uniform float uAOStrength;
uniform sampler2D uPrevFrame;
uniform float uTrail;

uniform float uDofStrength;
uniform float uDofDistance;

uniform float uSoftShadows;
uniform float uLightStrength;

uniform vec3 uMotionBlurPrevPos;
uniform vec4 uMotionBlurPrevRot;

in highp vec2 vTexCoord; 
layout(location = 0) out vec4 fragColor;


vec3 uLambertLightLocation2;


//iteraetion count
#define ITERATIONS 0.0

#define STEPS 0
#define NORMALSTEPS 0
#define TRANSMISSIONSTEPS 32

#define REFLECTIONS 1

#define TRANSMISSIONRAYS 2

#define makeLength2(type) float length2(type v) { return dot(v, v); }

float distance2(vec3 a, vec3 b) {
    vec3 diff = a - b;
    return dot(diff, diff);
}

makeLength2(vec2)

const float tau = 6.28318531;
vec2 boxMuller(float a, float b) {
    return vec2(
        cos(tau * b),
        sin(tau * b)
    ) * sqrt(-2.0 * log(a));
}




//rotate using quaternion
vec3 rotateQuat(vec3 position, vec4 q)
{ 
  vec3 v = position.xyz;
  return v + 2.0 * cross(q.yzw, cross(q.yzw, v) + q.x * v);
}

//reflect across all three axes
vec3 reflectAxes(vec3 a) {
    return abs(a.zxy);
}

//ray reflection iteration
vec3 rayReflectIteration(vec3 a, vec3 offset, float iteration) {
	return rotateQuat(reflectAxes(a) + offset, uIterationRotationQuaternion);
}


//cube signed distance function (SDF)
float cubeSDF(vec3 rayPosition, vec3 cubePosition, float cubeSize) {
	vec3 dist = abs(rayPosition) - cubePosition;
	return max(max(max(dist.x, dist.y), dist.z), 0.0) + min(max(dist.x, max(dist.y, dist.z)), 0.0);
}

//fractal SDF
float fractalSDF(vec3 rayPosition, vec3 spherePosition, float sphereRadius, out vec3 color) {
	vec3 rayPos2 = rayPosition;
    float minDist = 99999.9;
    float minDist2 = 99999.9;
    float minDist3 = 99999.9;
	for (float i = 0.0; i < ITERATIONS; i++) {
		rayPos2 = rayReflectIteration(rayPos2 / uScaleFactor, vec3(-2.0), i);
        minDist = min(minDist, distance2(rayPos2, vec3(1.0)));
        minDist2 = min(minDist2, distance2(rayPos2, vec3(-0.5, 1.0, 0.5)));
        minDist3 = min(minDist2, distance2(rayPos2, vec3(1.0, -1.0, -1.0)));
	}
    color = vec3(minDist * 0.5, minDist2 * 0.5, minDist3 * 0.5);
	return cubeSDF(rayPos2, spherePosition, sphereRadius) * pow(uScaleFactor, ITERATIONS);
}

//scene SDF
float globalSDF(vec3 rayPosition, out vec3 color) {
	return fractalSDF(/*mod(rayPosition + vec3(1.0f), 2f) - vec3(1.0f)*/rayPosition, vec3(2.0, 2.0, 2.0), 2.0, color);
}
//scene SDF
float globalSDF(vec3 rayPosition) {
    vec3 color;
	return fractalSDF(/*mod(rayPosition + vec3(1.0f), 2f) - vec3(1.0f)*/rayPosition, vec3(2.0, 2.0, 2.0), 2.0, color);
}

//march a single ray
vec3 marchCameraRay(vec3 origin, vec3 direction, out float finalMinDist, out int stepsBeforeThreshold, out vec3 color) {
	vec3 directionNormalized = normalize(direction);
	vec3 position = origin;
	float minDist = 0.0;
	for (int i = 0; i < STEPS; i++) {
		minDist = globalSDF(position, color);
		position += directionNormalized * minDist;
		if (minDist < uHitThreshold) {
			stepsBeforeThreshold = i;
            break;
		}
	}
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
		// if (minDist < uHitThreshold) {
        //     break;
		// }
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
		if (minDist < uHitThreshold || sign(position.x - uLambertLightLocation2.x) != sign(origin.x - uLambertLightLocation2.x)) {
			stepsBeforeThreshold = i;
            break;
		}
	}
	finalMinDist = minDist;
	return position;
}

vec3 marchRayTrio(vec3 coords, vec3 direction, out float finalMinDist, out int stepsBeforeThreshold, out vec3 normal, out vec3 color) {
	vec3 dist = marchCameraRay(coords, direction, finalMinDist, stepsBeforeThreshold, color);
    vec3 dirNormal1 = normalize(cross(direction, vec3(1.0, 1.0, 1.0)));
    vec3 dirNormal2 = normalize(cross(direction, dirNormal1));
    vec3 nDistX = marchNormalFindingRay(dist + dirNormal1 * 0.00024, direction);
    vec3 nDistY = marchNormalFindingRay(dist + dirNormal2 * 0.00024, direction);
    normal = -normalize(cross(dist - nDistX, dist - nDistY));
    return dist;
}

//light sources (currently unused)
vec3 lightSource = vec3(-1.0, -1.4, 0.0) * 2.5;
vec3 lightSource2 = vec3(1.0, 0.6, 0.5) * 2.5;

//lambertian diffuse shading
vec3 lambertShading(vec3 color, vec3 normal, vec3 light) {
	vec3 lightNormalized = normalize(light);
	float lightIntensity = max(0.0, dot(normal, lightNormalized)) / dot(light, light);
	return color * lightIntensity * uLightStrength;
}

//random function I found on stackoverflow
/*float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}*/

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
    seed += vec2(1.0);
    return rand(seed);
}
vec3 hemisphericalSample(vec3 normal) {
    vec3 randomSample = vec3(boxMuller(rand(), rand()), boxMuller(rand(), rand()).x);
    return randomSample * sign(dot(normal, randomSample));
}


vec3 getColor(vec3 position, vec3 normal, int steps, vec3 shadowPosition, vec3 baseColor) {
    float colorFactor;
    
	if (sign(shadowPosition.x - uLambertLightLocation2.x) != sign(position.x - uLambertLightLocation2.x)) {
        colorFactor = mix(uShadowBrightness, 1.0, lambertShading(vec3(1.0), normal, uLambertLightLocation2 - position).x);//;
	} else {
        colorFactor = uShadowBrightness;
	}

    return baseColor * (1.0 - float(steps) / float(STEPS) * uAOStrength) * colorFactor;
}

vec3 rgbAsymptote(vec3 rgb) {
    return rgb;//1.0 - 0.5 / (rgb + 0.5);
}

//marches the rays, calculates normals, determines and returns color, etc.
void main() {
    seed = vTexCoord + vec2(uTime);

	vec3 coords = gl_FragCoord.xyz / (uViewportSize.y) - vec3(uViewportSize.x / uViewportSize.y * 0.5, 0.5, 0.0);
	vec2 texCoords = coords.xy;
    coords.x *= 1.5 * uFOV;
	coords.y *= 1.5 * uFOV;
	

    vec3 outColor = vec3(0.0);

    vec2 cameraNoiseVecs = (vec2(
        rand(vec2(uTime * 77.0, -123.3 * uTime) * coords.xy),
        rand(vec2(uTime * -177.0, 346.0 * uTime) * coords.xy)
    ) - vec2(0.5)) / uViewportSize * 1.5 * uFOV;

    vec3 noiseVec3 = vec3(
        rand(vec2(uTime * 77.0, -123.3 * uTime) * coords.xy),
        rand(vec2(uTime * -177.0, 346.0 * uTime) * coords.xy),
        rand(vec2(uTime * 1277.0, 371.2 * uTime) * coords.xy)
    ) - vec3(0.5);

    vec3 cameraPosVecs = noiseVec3 * uDofStrength;

    uLambertLightLocation2 = uLambertLightLocation + noiseVec3 * uSoftShadows;

    vec3 rayStartPos = mix(uPosition, uMotionBlurPrevPos, noiseVec3.x) + cameraPosVecs;
    vec3 cameraRayGoal = rotateQuat(vec3(coords.x + cameraNoiseVecs.x, 1.0, coords.y + cameraNoiseVecs.y), mix(uRotationQuaternion, uMotionBlurPrevRot, noiseVec3.y)) * uDofDistance;

    vec3 cameraRay = normalize(cameraRayGoal - cameraPosVecs);

    for (int i = 0; i < REFLECTIONS; i++) {

        float distToSurface = 0.0;
        int steps1 = STEPS;
        vec3 normal;
        vec3 color;
        vec3 rayHit = marchRayTrio(rayStartPos, cameraRay, distToSurface, steps1, normal, color);
        
        float shadowDistToSurface = 0.0;
        int shadowSteps = STEPS;
        vec3 shadowRayHit1 = marchShadowRay(rayHit + (uLambertLightLocation2 - rayHit) * uHitThreshold * 10.0, (uLambertLightLocation2 - rayHit), shadowDistToSurface, shadowSteps);

        outColor += getColor(rayHit, normal, steps1, shadowRayHit1, color);

        vec3 reflectVec = reflect(cameraRay, normal);


        for (int j = 0; j < TRANSMISSIONRAYS; j++) {
            float randSample = rand(coords.xy + vec2(uTime + float(j) * 123.2, 2.34 * -uTime * float(j)));
            vec3 transmissionSample = mix(rayHit, rayStartPos, randSample);
            vec3 dirToLight = uLambertLightLocation2 - transmissionSample;
            vec3 transmissionRayHit = marchTransmissionRay(transmissionSample, dirToLight);
            if (sign(transmissionRayHit.x - uLambertLightLocation2.x) != sign(transmissionSample.x - transmissionRayHit.x)) outColor += vec3(0.05, 0.03, 0.01) / float(TRANSMISSIONRAYS);
        }


        float floati = float(i + 1);

        vec3 noise = (vec3(
            rand(coords.xy + vec2(uTime, uTime) + floati),
            rand(coords.xy + vec2(uTime + 234.0, -uTime) + floati),
            rand(coords.xy + vec2(-uTime - 76.0, 55.0 + uTime) + floati)
        ) - vec3(0.5))* uRoughness;

        rayStartPos = rayHit + reflectVec * uHitThreshold * 15.0;
        #ifdef DIFFUSE
        cameraRay = hemisphericalSample(normal);//normal + noise;
        #else
        cameraRay = reflectVec + noise;
        #endif
    }

    outColor /= float(REFLECTIONS);
    outColor *= 2.0;
    outColor = rgbAsymptote(outColor);

    #ifdef ADDITIVE
    fragColor = vec4(outColor, 1.0) * uTrail + vec4(texture(uPrevFrame, vTexCoord).rgb, 1.0);//vec4(outColor * (1.0 - float(steps1) / float(STEPS)) * colorFactor, 1.0);
    #else
    fragColor = mix(vec4(outColor, 1.0), vec4(texture(uPrevFrame, vTexCoord).rgb, 1.0), uTrail);
    #endif

    #ifdef RESET
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    #endif

    //gl_FragColor = vec4(uIterationRotationQuaternion.rgb, 1.0);
}