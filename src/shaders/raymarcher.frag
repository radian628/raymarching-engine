#version 300 es

//REPLACEHERE

#ifdef GL_ES
    precision highp float;
#endif

//#define DIFFUSE
//#define ADDITIVE

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

uniform float uBlendFactor;

uniform float uDOFStrength;
uniform float uFocalPlaneDistance;

uniform float uShadowSoftness;
uniform float uLightStrength;

uniform vec3 uMotionBlurPrevPos;
uniform vec4 uMotionBlurPrevRot;
uniform float uTimeMotionBlurFactor;


in highp vec2 vTexCoord; 
layout(location = 0) out vec4 fragColor;


vec3 uLambertLightLocation2;


//iteraetion count
#define ITERATIONS 8.0

#define STEPS 0
#define NORMALSTEPS 0
#define TRANSMISSIONSTEPS 32

#define REFLECTIONS 1

#define TRANSMISSIONRAYS 2

#define SAMPLESPERFRAME 1

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
vec2 seed2;
float rand2() {
    seed2 += vec2(1.0);
    return rand(seed2);
}

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

vec4 quatAngleAxis(float angle, vec3 axis) {
    return vec4(cos(angle), axis * sin(angle));
}

//REPLACE_START(globalSDF)

//reflect across all three axes

float time;

//SDF_START
float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic, out bool background) {
    metallic = true;
    //return fractalSDF(/*mod(rayPosition + vec3(1.0f), 2f) - vec3(1.0f)*/position, vec3(2.0, 2.0, 2.0), 2.0, color, roughness);

    //metallic = true;  
    float time3 = time * 0.01;
    vec3 offset = vec3(
        0.0 + floor((position.z) / 2.0) * time3,
        0.0 + floor((position.z) / 2.0) * time3,
        0.0
        
        );
    vec3 adjustedPosition = position + offset; 
    vec3 d = abs(mod(adjustedPosition, 2.0) - vec3(1.0)) - vec3(0.5);
    d *= vec3(0.5, 0.5, 1.0);
    adjustedPosition += vec3(1.0);
        seed2 = floor((adjustedPosition.xy + 1.0) / 2.0) + floor((adjustedPosition.zx + 1.0) / 2.0);
    vec3 positionNoise = vec3(
        rand2() - 0.0,
        rand2() - 0.0,
        rand2() - 0.0
    ) * 1.0;
    //d = rotateQuat(d, vec4(0.9689124217106447, 0.12370197962726147, 0.12370197962726147, 0.12370197962726147));
    // if (d.z > max(d.x, d.y)) {
    //     color = texture(img, d.xy * 2.0).rgb;
    // }
    // if (d.y > max(d.x, d.z)) {
    //     color = texture(img, d.xz * 2.0).rgb;
    // }
    // if (d.x > max(d.z, d.y)) {
    //     color = texture(img, d.yz * 2.0).rgb;
    // }
    color = positionNoise;
    roughness = 0.0;
    //return length(d) - 0.5;
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

//march a single ray
vec3 marchCameraRay(vec3 origin, vec3 direction, out float finalMinDist, out int stepsBeforeThreshold, out vec3 color, out float roughness, out bool metallic, out bool background) {
	vec3 directionNormalized = normalize(direction);
	vec3 position = origin;
	float minDist = 0.0;
	for (int i = 0; i < STEPS; i++) {
		minDist = globalSDF(position);
		position += directionNormalized * minDist;
		if (minDist < uRayHitThreshold) {
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

float biasToCenter(float x) {
    return 4.0 * pow(x - 0.5, 2.0) * sign(x - 0.5);
}

vec3 rgbAsymptote(vec3 rgb) {
    return rgb;//1.0 - 0.5 / (rgb + 0.5);
}

//marches the rays, calculates normals, determines and returns color, etc.
void main() {
    vec3 outColor = vec3(0.0);
    seed = vTexCoord + vec2(uNoiseSeed);

    for (int samples = 0; samples < int(SAMPLESPERFRAME); samples++) {
        time = uTime + biasToCenter(rand()) * uTimeMotionBlurFactor;

        vec3 coords = gl_FragCoord.xyz / (uViewportSize.y) - vec3(uViewportSize.x / uViewportSize.y * 0.5, 0.5, 0.0);
        vec2 texCoords = coords.xy;
        coords.x *= 1.5 * uFOV;
        coords.y *= 1.5 * uFOV;
        

        vec2 cameraNoiseVecs = (vec2(
            rand(),//rand(vec2(uTime * 77.0, -123.3 * uTime) * coords.xy),
            rand()//rand(vec2(uTime * -177.0, 346.0 * uTime) * coords.xy)
        ) - vec2(0.5)) / uViewportSize * 1.5 * uFOV;

        vec3 noiseVec3 = vec3(
            rand(),//rand(vec2(uTime * 77.0, -123.3 * uTime) * coords.xy),
            rand(),//rand(vec2(uTime * -177.0, 346.0 * uTime) * coords.xy),
            rand()//rand(vec2(uTime * 1277.0, 371.2 * uTime) * coords.xy)
        ) - vec3(0.5);

        vec3 cameraPosVecs = noiseVec3 * uDOFStrength;

        uLambertLightLocation2 = uLambertLightLocation + noiseVec3 * uShadowSoftness;

        vec3 rayStartPos = mix(uPosition, uMotionBlurPrevPos, noiseVec3.x) + cameraPosVecs;
        vec3 cameraRayGoal = rotateQuat(vec3(coords.x + cameraNoiseVecs.x, 1.0, coords.y + cameraNoiseVecs.y), mix(rotation, uMotionBlurPrevRot, noiseVec3.y)) * uFocalPlaneDistance;

        vec3 cameraRay = normalize(cameraRayGoal - cameraPosVecs);

        for (int i = 0; i < REFLECTIONS; i++) {

            float distToSurface = 0.0;
            int steps1 = STEPS;
            vec3 normal;
            vec3 color;
            float roughness;
            bool metallic;
            bool background;
            vec3 rayHit = marchRayTrio(rayStartPos, cameraRay, distToSurface, steps1, normal, color, roughness, metallic, background);
            
            float shadowDistToSurface = 0.0;
            int shadowSteps = STEPS;
            vec3 shadowRayHit1 = marchShadowRay(rayHit + (uLambertLightLocation2 - rayHit) * uRayHitThreshold * 10.0, (uLambertLightLocation2 - rayHit), shadowDistToSurface, shadowSteps);

            if (background) {
                outColor = color;
                break;
            } else {
                outColor += getColor(rayHit, normal, steps1, shadowRayHit1, color);
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
                rand(),//rand(coords.xy + vec2(uTime, uTime) + floati),
                rand(),//rand(coords.xy + vec2(uTime + 234.0, -uTime) + floati),
                rand()//rand(coords.xy + vec2(-uTime - 76.0, 55.0 + uTime) + floati)
            ) - vec3(0.5)) * roughness;

            rayStartPos = rayHit + reflectVec * uRayHitThreshold * 15.0;
            if (metallic) {
                cameraRay = reflectVec + noise;
            } else {
                cameraRay = hemisphericalSample(normal);
            }
        }
    }
    outColor /= float(REFLECTIONS * SAMPLESPERFRAME);
    outColor *= 2.0;
    outColor = abs(rgbAsymptote(outColor));

    #ifdef ADDITIVE
    fragColor = vec4(outColor, 1.0) * uBlendFactor + vec4(texture(uPrevFrame, vTexCoord).rgb, 1.0);//vec4(outColor * (1.0 - float(steps1) / float(STEPS)) * colorFactor, 1.0);
    #else
    fragColor = mix(vec4(outColor, 1.0), vec4(texture(uPrevFrame, vTexCoord).rgb, 1.0), uBlendFactor);
    #endif

    #ifdef RESET
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    #endif

    //gl_FragColor = vec4(uIterationRotationQuaternion.rgb, 1.0);
}