/*ui
[

]
*/


//note: you will need to move away from the center for this one to work properly.
float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic, out bool background) {
    float minDist = 9999.9;
    float sphere = length(position) - 1.0;
    float plane = position.z + 1.0;
    float env = -(length(position) - 100.0);
    minDist = min(sphere, min(plane, env));
    metallic = false;
    if (minDist == sphere) {
        color = vec3(1.0, 0.5, 0.0);
    } else if (minDist == plane) {
        color = vec3(0.9);
    } else {
        background = true;
        color = 2.0 * vec3(0.3, 0.4, 0.5) * dot(normalize(position), normalize(uLambertLightLocation));
    }
    return minDist;
}