/*ui
[{
    id: "speed",
    type: "range",
    min: 0,
    max: 5,
    value: 1,
    step: 0.001,
    label: "Speed",
    description: "Speed at which the cubes move."
}]
*/
uniform float speed;

float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic) {
    metallic = true;

    float timeScaled = time * 0.01 * speed;
    vec3 offset = vec3(
        0.0 + floor((position.z) / 2.0) * timeScaled,
        0.0 + floor((position.z) / 2.0) * timeScaled,
        0.0);
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

    color = positionNoise;
    roughness = 0.0;
    return min(max(d.x,max(d.y,d.z)),0.0) +
         length(max(d,0.0));
}