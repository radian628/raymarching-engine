#version 300 es

precision highp float;


uniform float blendWithPreviousFactor;
uniform sampler2D previousColor;
uniform vec2 randNoise;
uniform vec3 position;
uniform mat4 rotation;

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
    float u1 = random(seed + randNoise);
    float u2 = random(seed + randNoise + vec2(0.5, 0.3));
    float twoPiU2 = 2.0 * PI * u2;
    return sqrt(-2.0 * log(u1)) * vec2(
        cos(twoPiU2), sin(twoPiU2)
    );
}

vec3 sceneDiffuseColor(vec3 position) {
    return vec3(mod(position / 3.0, 1.0) * 0.5 + vec3(0.5));
}

vec3 sceneSpecularColor(vec3 position) {
    return vec3(0.3);//vec3(mod(position / 3.0, 1.0) * 0.5 + vec3(0.5)) * 1.0;
}

float sceneSpecularRoughness(vec3 position) {
    return 0.5;
}

vec3 sceneEmission(vec3 position) {
    float sphere1 = sdfSphere(position, vec3(-1,0,4), 1.0);
    float sphere2 = sdfSphere(mod(position, 2.0) - 1.0, vec3(0,0,0), 0.7);
    float plane = position.y + 1.0;
    if (min(sphere1, sphere2) > 0.01 || min(sphere1, min(sphere2, plane)) == plane) return vec3(0.0);
    return (min(sphere1, sphere2) == sphere1) ? vec3(14.0) : vec3(0.0);
}

float sdf(vec3 position) {
    return min(
        sdfSphere(position, vec3(-1,0,4), 1.0),
        min(sdfSphere(mod(position, 2.0) - 1.0, vec3(0,0,0), 0.7),
        position.y + 1.0)
    );
}

vec3 normal(vec3 position, float delta) {
    float sdfAtPos = sdf(position);
    return normalize(vec3(
        sdf(position + vec3(delta, 0, 0)) - sdfAtPos,
        sdf(position + vec3(0, delta, 0)) - sdfAtPos,
        sdf(position + vec3(0, 0, delta)) - sdfAtPos
    ));
}

vec3 castRay(vec3 rayPosition, vec3 rayDirection, float steps) {
    for (float i = 0.0; i < steps; i++) {
        rayPosition = rayPosition + rayDirection * sdf(rayPosition);
    }
    return rayPosition;
}

void main(void) {
    vec3 dofOffset = vec3(
        random(randNoise + texcoord),
        random(randNoise + texcoord * 2.0),
        random(randNoise + texcoord * 3.0)
    ) * 0.1;
    vec3 rayPosition = position + dofOffset;
    vec2 randomDirectionOffset = vec2(random(randNoise + texcoord.xy), random(randNoise + texcoord.xy * 2.0))
        / vec2(textureSize(previousColor, 0)) * 1.0;
    vec3 rayDirectionNotNormalized = (rotation * vec4(texcoord.xy * 2.0 - 1.0 + randomDirectionOffset, 1.0, 0.0)).xyz;
    vec3 rayDirectionGoal = rayDirectionNotNormalized * 5.0;
    vec3 rayDirection = normalize(rayDirectionGoal - dofOffset);

    vec3 currentAlbedo = vec3(1.0);
    vec3 currentLight = vec3(0.0);
    float probabilityFactor = 1.0;

    for (int i = 0; i < 3; i++) {
        rayPosition = castRay(rayPosition, rayDirection, 64.0);
        currentLight += currentAlbedo * sceneEmission(rayPosition);
        vec3 normal = normal(rayPosition, 0.0001);

        vec3 diffuseCol = sceneDiffuseColor(rayPosition);
        vec3 specularCol = sceneSpecularColor(rayPosition);

        float diffuseBrightness = length(diffuseCol);
        float specularBrightness = length(specularCol);

        float probFactor = (diffuseBrightness > specularBrightness)
            ? (1.0 - specularBrightness / diffuseBrightness / 2.0)
            : (diffuseBrightness / specularBrightness / 2.0);

        if (random(rayPosition.xy + randNoise) < probFactor) {
            probabilityFactor *= 1.0 - probFactor;
            currentAlbedo *= diffuseCol;
            vec3 newDir = normalize(vec3(random(rayPosition.xy), random(rayPosition.yz), random(rayPosition.xz)));
            rayDirection = sign(dot(normal, newDir)) * newDir;
        } else {
            probabilityFactor *= probFactor;
            currentAlbedo *= specularCol;
            vec3 randVec = normalize(vec3(random(rayPosition.xy + randNoise), random(rayPosition.yz + randNoise), random(rayPosition.xz + randNoise)));
            rayDirection = reflect(rayDirection, normal);
            vec3 axis = normalize(cross(randVec, rayDirection));
            rayDirection = rodrigues(rayDirection, axis, sceneSpecularRoughness(rayPosition) * random(rayPosition.xy + randNoise * 2.0));
        }

        rayPosition += rayDirection * 0.01;
    }


    //vec4 currentFragColor = vec4(vec3(dot(normal(rayPosition, 0.0001), normalize(vec3(1.0, 1.0, -1.0)))), 1.0);
    
    fragColor = mix(
        vec4(currentLight, 1.0),
        texture(previousColor, texcoord),
        blendWithPreviousFactor
    );
}