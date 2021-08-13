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
    },
    {
        id: "uSphereSizeFactor",
        type: "range",
        min: 0,
        max: 0.5,
        value: 0.22,
        label: "Sphere Size Factor",
        description: "Determines scale of spheres."
    }
]
*/

uniform float uScaleFactor;
uniform float uOffset;
uniform float uIterations;
uniform float uSphereSizeFactor;

//note: you will need to move away from the center for this one to work properly.
float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic, out bool background) {
    float minDist = 9999.9;
    for (float i = -1.0; i < uIterations; i++) {
        float sf = pow(uScaleFactor, i);
        ivec3 index = ivec3(position / 2.0);
        color = vec3(1.0, 1.0, 0.9);
        metallic = true;
        roughness = float(index.x) * 0.01;
        vec3 d = abs(mod(position + vec3(uOffset * sf), sf) - vec3(sf / 2.0)) - vec3(sf / 3.0);
        float dist = length(d) - uSphereSizeFactor * sf;
        minDist = min(dist, minDist);
    }
    minDist = max(length(position) - 5.0, -minDist);
    if (length(position) > 100.0) {
        background = true;
        vec3 npos = normalize(position);
        vec3 nl = normalize(uLambertLightLocation);
        vec3 t = cross(nl, vec3(1.0, 0.0, 0.0));
        vec3 bt = cross(nl, t);
       color = vec3(0.2, 0.2, 0.7) * 5.0 * (0.5 + 0.5 * dot(npos, nl))
      +vec3(0.2, 0.7, 0.2) * 5.0 * (0.5 + 0.5 * dot(npos, t))
      +vec3(0.7, 0.2, 0.2) * 5.0 * (0.5 + 0.5 * dot(npos, bt));
      return 100.0;
    }
    return minDist;
}