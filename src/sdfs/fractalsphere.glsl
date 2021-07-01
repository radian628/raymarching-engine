/*ui
[
    {
        id: "uScaleFactor",
        type: "range",
        min: 0,
        max: 1,
        value: 0.5,
        step: 0.001,
        label: "Fractal Scale Factor",
        description: "Size factor between successive iterations of fractal."
    },
    {
        id: "uOffset",
        type: "range",
        min: 0,
        max: 1,
        value: 0.0,
        step: 0.001,
        label: "Fractal Offset",
        description: "Offset of cubes in iterations."
    },
    {
        id: "uIterations",
        type: "range",
        min: 0,
        max: 20,
        value: 12,
        step: 1,
        label: "Fractal Iterations",
        description: "Number of cube grids."
    }
]
*/

uniform float uScaleFactor;
uniform float uOffset;
uniform float uIterations;

//note: you will need to move away from the center for this one to work properly.
float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic, out bool background) {
    float minDist = 9999.9;
    for (float i = -1.0; i < uIterations; i++) {
        float sf = pow(uScaleFactor, i);
        ivec3 index = ivec3(position / 2.0);
        color = vec3(1.0, 1.0, 0.9);
        metallic = false;
        roughness = float(index.x) * 0.01;
        vec3 d = abs(mod(position + vec3(uOffset * sf), sf) - vec3(sf / 2.0)) - vec3(sf / 3.0);
        float dist = min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
        minDist = min(dist, minDist);
    }
    minDist = max(length(position) - 5.0, -minDist);
    if (length(position) > 100.0) {
        background = true;
        color = vec3(0.6, 0.26, 0.1);
    }
    return minDist;
}