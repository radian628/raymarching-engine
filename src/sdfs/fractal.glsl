vec3 reflectAxes(vec3 a) {
    return abs(a.zxy);
}

//ray reflection iteration
vec3 rayReflectIteration(vec3 a, vec3 offset, float iteration) {
	return rotateQuat(reflectAxes(a) + offset, vec4(0.9689124217106447, 0.12370197962726147, 0.12370197962726147, 0.12370197962726147));
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
	for (float i = 0.0; i < 8.0; i++) {
		rayPos2 = rayReflectIteration(rayPos2 / 0.5, vec3(-2.0), i);
        minDist = min(minDist, distance2(rayPos2, vec3(1.0)));
        minDist2 = min(minDist2, distance2(rayPos2, vec3(-0.5, 1.0, 0.5)));
        minDist3 = min(minDist2, distance2(rayPos2, vec3(1.0, -1.0, -1.0)));
	}
	float result = cubeSDF(rayPos2, spherePosition, sphereRadius, color) * pow(0.5, 8.0);
    color = texture(img, vec2(minDist, minDist2)).rgb;
    if (length(rayPosition) > 100.0) {
        background = true;
        color = vec3(0.3, 0.4, 0.6);
    }
    roughness = 1.0 - color.x;
    return result;
}

float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic, out bool background) {
    metallic = true;
    return fractalSDF(position, vec3(2.0, 2.0, 2.0), 2.0, color, roughness, background);
}