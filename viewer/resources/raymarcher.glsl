#version 300 es

precision highp float;

in vec2 in_position;
out vec4 fragColor;

//camera params
uniform vec3 cameraPosition;
uniform vec4 cameraRotation;
uniform vec2 fovs;

//raymarch step counts
uniform uint primaryRaymarchingSteps;
uniform uint reflections;

//random noise
uniform vec2 randNoise;

//blending
uniform bool isAdditive;
uniform float blendFactor;

//dof 
uniform float focalPlaneDistance;
uniform float circleOfConfusionRadius;

//fog
uniform float fogDensity;

//realtime mode
uniform bool isRealtimeMode;

uniform sampler2D prevFrameColor;

const float PI = 3.14159265;



//======================= UTILS ===================

vec4 quatAngleAxis(float angle, vec3 axis) {
  return vec4(axis * sin(angle / 2.0), cos(angle / 2.0));
}

vec3 rotateQuat(vec3 position, vec4 q)
{ 
  vec3 v = position.xyz;
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}
vec2 seed;
float rand() {
  seed.x += 1.0123123;
  seed.y += 1.0432;
  return rand(seed);
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



//SCENE_PARAMS_START
vec3 repeat(vec3 p, vec3 c) {
  return mod(p+0.5*c,c)-0.5*c;
}

float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float PRIMITIVE1(vec3 position2) {
  vec3 position = position2;//repeat(position2, vec3(15.0));
  float sphereGridDist = 99999.0;
  for (float i = 0.0; i < 14.0; i++) {
    float sf = pow(0.5, i);
  vec3 p = repeat(position + vec3(0.0), vec3(2.0 * sf));
    sphereGridDist = min(
      sphereGridDist, length(p) - 0.69 * sf
    );
  }
  return max(length(position - vec3(0.0, 0.0, 2.5)) - 2.0, -sphereGridDist);
  // float minDist = sdBox(position, vec3(1.0));
  // for (float i = 1.0; i < 4.0; i++) {
  //     float sf = pow(0.33333333333, i);
  //     vec3 centerer = vec3(sf / 2.0);
  //     vec3 d = abs(mod(position, sf) - vec3(sf / 2.0));
  //     minDist = max(minDist,
  //       -min(
  //           min(
  //             sdBox(d, vec3(sf * 1.1, sf / 6.0, sf / 6.0)),
  //             sdBox(d, vec3(sf / 6.0, sf * 1.1, sf / 6.0))
  //           ),
  //           sdBox(d, vec3(sf / 6.0, sf / 6.0, sf * 1.1))
  //       )
  //     );
  // }
  // return minDist;
}

float PRIMITIVE2(vec3 position) {
  return -(length(position) - 4.0);
}

float PRIMITIVE3(vec3 position) {
  return length(position - vec3(0.0, 0.0, 2.5)) - 1.1;
}

float SDF(vec3 position) {
  return min(
    PRIMITIVE1(position),
    min(
      PRIMITIVE2(position),
      PRIMITIVE3(position)
    )
  );
}

vec3 albedo(vec3 position) {
  float sdf = SDF(position);
  if (sdf == PRIMITIVE1(position)) {
    return vec3(0.3);
  } else if (sdf == PRIMITIVE2(position)) {
    return vec3(0.0);
  } else if (sdf == PRIMITIVE3(position)) {
    return vec3(0.0);
  }
  //if (sdf == PRIMITIVE1(position)) {
  //  return vec3(1.0);
  //} else if (sdf == PRIMITIVE)
  //return vec3(0.0);
}

vec3 emission(vec3 position) {
  float sdf = SDF(position);
  if (sdf == PRIMITIVE1(position)) {
    return vec3(0.0);
  } else if (sdf == PRIMITIVE2(position)) {
    return 
    vec3(1.0 + rand(), 0.2 + rand(), 0.0 + rand()) * 5.5 *
    pow(max(0.0, 0.5 + 0.5 * dot(normalize(position + vec3(0.001)), normalize(vec3(1.0, 1.0, -1.0)))), 32.0);// + 
    //vec3(0.9, 0.5, 0.1) * 5.5 *
    //pow(max(0.0, 0.5 + 0.5 * dot(normalize(position + vec3(0.001)), normalize(vec3(1.0, -1.0, -1.0)))), 16.0) + 
    //vec3(0.7, 0.7, 0.3) * 5.5 *
    //pow(max(0.0, 0.5 + 0.5 * dot(normalize(position + vec3(0.001)), normalize(vec3(-1.0, 1.0, -1.0)))), 16.0);
  } else if (sdf == PRIMITIVE3(position)) {
    return vec3(0.3, 0.4, 0.8) * 6.0;
  }
}

float roughness(vec3 position) {
  return 0.6;
}
//SCENE_PARAMS_END




void marchRay(vec3 startPosition, vec3 direction, uint steps, out vec3 finalPosition) {
  vec3 position = startPosition;
  for (uint i = 0u; i < steps; i++) {
    position += direction * SDF(position);
  }
  finalPosition = position;
}

void marchRay(vec3 startPosition, vec3 direction, uint steps, out vec3 finalPosition, out uint stepCount) {
  vec3 position = startPosition;
  for (uint i = 0u; i < steps; i++) {
    float distance = SDF(position);
    position += direction * distance;
    if (distance > 0.0001) {
      stepCount = i;
    }
  }
  finalPosition = position;
}



vec3 gradient(vec3 position, float delta) {
  float sdf = SDF(position);
  return (vec3(
    SDF(position + vec3(delta, 0.0, 0.0)),
    SDF(position + vec3(0.0, delta, 0.0)),
    SDF(position + vec3(0.0, 0.0, delta))
  ) - sdf) / delta;
}
vec3 gradientNoDiv(vec3 position, float delta) {
  float sdf = SDF(position);
  return (vec3(
    SDF(position + vec3(delta, 0.0, 0.0)),
    SDF(position + vec3(0.0, delta, 0.0)),
    SDF(position + vec3(0.0, 0.0, delta))
  ) - sdf);
}

vec2 randInCircle() {
  //float mag = pow(rand(), 0.05);
  float mag = sqrt(rand());
  float theta = rand() * PI * 2.0;
  return vec2(cos(theta), sin(theta)) * mag;
}

vec3 getSample() {
    vec2 directionProjectedThroughZEqualsOne = (in_position.xy + vec2(rand(), rand()) / vec2(textureSize(prevFrameColor, 0))) * fovs;
    vec3 directionWithoutRotationOrDOF = vec3(directionProjectedThroughZEqualsOne, 1.0);
    vec3 vecFromPositionToFocalPlane = rotateQuat(directionWithoutRotationOrDOF, cameraRotation) * focalPlaneDistance;
    vec2 circleOfConfusionNoise = randInCircle() * circleOfConfusionRadius;
    vec3 circleOfConfusionOffset = rotateQuat(vec3(circleOfConfusionNoise, 0.0), cameraRotation);
    vec3 direction = normalize(vecFromPositionToFocalPlane - circleOfConfusionOffset);
    vec3 rayStartPosition = cameraPosition + circleOfConfusionOffset;
    vec3 finalPosition;
  #define IS_REALTIME_MODE
  #ifdef IS_REALTIME_MODE
    uint stepCount;
    marchRay(rayStartPosition, direction, primaryRaymarchingSteps, finalPosition, stepCount);
    return vec3(float(stepCount) / float(primaryRaymarchingSteps));
  #else

    vec3 accumulatedLight = vec3(0.0);
    vec3 accumulatedAlbedo = vec3(1.0);
    for (uint i = 0u; i < reflections; i++) {
      marchRay(rayStartPosition, direction, primaryRaymarchingSteps, finalPosition);

      float lambda = fogDensity;
      const float E = 2.71828183;

      float pathLength = distance(rayStartPosition, finalPosition);

      //float volumetricChance = 1.0 - exp(-lambda * pathLength);
      
      float volumetricSample = -1.0 / lambda * log(1.0 - rand());

      if (volumetricSample < pathLength) {
        //float volumetricPositionFactor = lambda * exp(-lambda * pathLength);
        rayStartPosition = rayStartPosition + direction * volumetricSample;
        direction = normalize(vec3(boxMuller(rand(), rand()), boxMuller(rand(), rand()).x));
        //vec3 randVec = vec3(boxMuller(rand(), rand()), boxMuller(rand(), rand()).x);
        //direction = rotateQuat(direction, quatAngleAxis(0.6, normalize(cross(randVec, direction))));
      } else {
        accumulatedLight += emission(finalPosition) * accumulatedAlbedo;
        accumulatedAlbedo *= albedo(finalPosition);
        
        vec3 normal = normalize(gradientNoDiv(finalPosition, 0.0001));
        vec3 reflectDirection = reflect(direction, normal);
        direction = normalize(
          mix(reflectDirection, normalize(hemisphericalSample(normal)), roughness(finalPosition))
        );
        rayStartPosition = finalPosition + direction * 0.001;
      }
      
      //accumulatedAlbedo *= max(1.0 - volumetricChance, 0.0);
  
    }
    return accumulatedLight;
  #endif
}

void main() {
  vec2 texCoord = in_position.xy * 0.5 + 0.5;
  seed = in_position.xy + randNoise;
  vec3 color = vec3(0.0);
  for (uint i = 0u; i < 1u; i++) {
    color += getSample();
  }
  color /= 1.0;
  //fragColor = vec4(color, 1.0);
  if (isAdditive) {
    fragColor = vec4(color * blendFactor + texture(prevFrameColor, texCoord).rgb, 1.0);
  } else {
    fragColor = vec4(mix(color, texture(prevFrameColor, texCoord).rgb, blendFactor), 1.0);
  }
  //fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}