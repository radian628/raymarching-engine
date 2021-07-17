/*ui
[
    {
        id: "uIterations",
        type: "range",
        min: 0,
        max: 20,
        value: 8,
        step: 1,
        label: "Fractal Iterations",
        description: "Number of cube grids."
    }
]
*/

float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}


uniform float uIterations;

float scaleFactor = 0.33333333333;

//note: you will need to move away from the center for this one to work properly.
float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic, out bool background) {
    float minDist = sdBox(position, vec3(3.0));
    for (float i = -1.0; i < uIterations; i++) {
        float sf = pow(scaleFactor, i);
        color = vec3(1.0, 1.0, 1.0);
        metallic = false;
        roughness = 0.00001;
      	vec3 centerer = vec3(sf / 2.0);
        vec3 d = abs(mod(position, sf) - vec3(sf / 2.0));
        minDist = max(minDist,
          -min(
             min(
               sdBox(d, vec3(sf * 1.1, sf / 6.0, sf / 6.0)),
               sdBox(d, vec3(sf / 6.0, sf * 1.1, sf / 6.0))
             ),
             sdBox(d, vec3(sf / 6.0, sf / 6.0, sf * 1.1))
          )
        );
    }
        
    //minDist = max(minDist, -sdBox(position, vec3(3.0)));

    minDist = min(minDist, -length(position) + 100.0);
    if (length(position) > 99.9) {
        background = true;
       color = vec3(0.3, 0.6, 0.8) * 5.0 * (0.5 + 0.5 * dot(normalize(uLambertLightLocation), normalize(position)));
    }
    return minDist;
}