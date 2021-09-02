/*ui
[
    {
        id: "uRotation1",
        type: "range",
        min: -3.141592,
        max: 3.141592,
        value: 0.5,
        step: 0.001,
        label: "Rotation1",
        description: "Fractal rotation about X-axis"
    },
    {
        id: "uRotation2",
        type: "range",
        min: -3.141592,
        max: 3.141592,
        value: 0.5,
        step: 0.001,
        label: "Rotation2",
        description: "Fractal rotation about Y-axis"
    },
    {
        id: "uRotation3",
        type: "range",
        min: -3.141592,
        max: 3.141592,
        value: 0.5,
        step: 0.001,
        label: "Rotation3",
        description: "Fractal rotation about Z-axis"
    },
    {
        id: "uFractalIterations",
        type: "range",
        min: 0,
        max: 20,
        value: 9,
        step: 1,
        label: "Fractal Iterations",
        description: "Number of times to apply the fractal iteration rule"
    }
]
*/

uniform float uRotation1;
uniform float uRotation2;
uniform float uRotation3;

uniform float uFractalIterations;

vec4 quat = vec4(0.9689124217106447, 0.12370197962726147, 0.12370197962726147, 0.12370197962726147);

vec3 reflectAxes(vec3 a) {
    return abs(a.zxy);
}

//ray reflection iteration
vec3 rayReflectIteration(vec3 a, vec3 offset, float iteration) {
	vec3 v1 = rotateQuat(reflectAxes(a) + offset, quatAngleAxis(uRotation1, vec3(1.0, 0.0, 0.0)));
	vec3 v2 = rotateQuat(v1, quatAngleAxis(uRotation2, vec3(0.0, 1.0, 0.0)));
	vec3 v3 = rotateQuat(v2, quatAngleAxis(uRotation3, vec3(0.0, 0.0, 1.0)));
    return v3;
}

//cube signed distance function (SDF)
float cubeSDF(vec3 rayPosition, vec3 cubePosition, float cubeSize, out vec3 color) {
	vec3 dist = abs(rayPosition) - cubePosition;
    vec3 d = dist;
	return max(max(max(dist.x, dist.y), dist.z), 0.0) + min(max(dist.x, max(dist.y, dist.z)), 0.0);
}

//fractal SDF
float fractalSDF(vec3 rayPosition, vec3 spherePosition, float sphereRadius, out vec3 color, out float roughness, out bool background) {
	vec3 rayPos2 = rayPosition;
    float minDist = 99999.9;
    float minDist2 = 99999.9;
    float minDist3 = 99999.9;
	for (float i = 0.0; i < uFractalIterations; i++) {
		rayPos2 = rayReflectIteration(rayPos2 / 0.5, vec3(-2.0), i);
        minDist = min(minDist, distance2(rayPos2, vec3(1.0)));
        minDist2 = min(minDist2, distance2(rayPos2, vec3(-0.5, 1.0, 0.5)));
        minDist3 = min(minDist3, distance2(rayPos2, vec3(1.0, -1.0, -1.0)));
	}
	float result = cubeSDF(rayPos2, spherePosition, sphereRadius, color) * pow(0.5, uFractalIterations);
    color = clamp(vec3(minDist, minDist2, minDist3) * 0.25, 0.0, 1.0);
    if (length(rayPosition) > 100.0) {
        background = true;
        color = 5.0 * vec3(0.3, 0.4, 0.5) * (dot(normalize(uLambertLightLocation), normalize(rayPosition)) * 0.5 + 0.5) * 3.0;
    }
    roughness = 1.0 - color.x;
    return result;
}

float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic, out bool background) {
    metallic = false;

    return fractalSDF(position, vec3(2.0, 2.0, 2.0), 2.0, color, roughness, background);
}