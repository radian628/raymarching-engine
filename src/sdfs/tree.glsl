/*ui
[
    {
        id: "uAngle1",
        type: "range",
        min: 0,
        max: 1.0,
        value: 0.2,
        label: "Angle 1",
        description: "Branch angle 1."
    },
    {
        id: "uAngle2",
        type: "range",
        min: 0,
        max: 1.0,
        value: 0.2,
        label: "Angle 2",
        description: "Branch angle 2."
    },
    {
        id: "uOffset1",
        type: "range",
        min: 0,
        max: 1.0,
        value: 0.18,
        label: "Offset 1",
        description: "Branch offset 1."
    },
    {
        id: "uOffset2",
        type: "range",
        min: 0,
        max: 1.0,
        value: 0.18,
        label: "Offset 2",
        description: "Branch offset 2."
    },
    {
        id: "uScaleFactor",
        type: "range",
        min: 0,
        max: 1.1,
        value: 0.7,
        label: "Branch Scale Factor",
        description: "How much to scale successive branches."
    },
    {
        id: "uFractalIterations",
        type: "range",
        min: 0,
        max: 20.0,
        value: 8.0,
        step: 1,
        label: "Fractal Iterations",
        description: "How many times to divide the branches."
    }
]
*/

uniform float uAngle1;
uniform float uAngle2;
uniform float uOffset1;
uniform float uOffset2;
uniform float uScaleFactor;
uniform float uFractalIterations;

vec3 rayReflect(vec3 position) {
	return vec3(abs(position.xy), position.z);
} 

vec3 rayRotate(vec3 position, float angleFactor, out float combinedSF) {
    float sf = uScaleFactor;
    position /= sf;
    combinedSF *= sf;
	position = rotateQuat(position, quatAngleAxis(angleFactor * uOffset1, vec3(1.0, 0.0, 0.0)));
    position = rotateQuat(position, quatAngleAxis(-angleFactor * uOffset2, vec3(0.0, 1.0, 0.0)));
    position = rayReflect(position);
	position = rotateQuat(position, quatAngleAxis(angleFactor * uAngle1, vec3(1.0, 0.0, 0.0)));
    position = rotateQuat(position, quatAngleAxis(-angleFactor * uAngle2, vec3(0.0, 1.0, 0.0)));
	return position;
}


float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic, out bool background) {

    color = vec3(1.0);

    metallic = false;

    if (length(position) > 100.0) {
    	background = true;
        color = vec3(0.3, 0.5, 0.7) * 2.5;
        return 100.0;
    }
  
    float dist = 100.0;
    float sf = 1.0;
    vec3 rotatedPosition = position;
    for (float i = 0.0; i < uFractalIterations; i++) {
        float branchDist = sf * sdBox(rotatedPosition, vec3(0.1, 0.1, 1.0));
        if (dist > branchDist) {
        	dist = branchDist;
          	color = vec3(0.12, 0.03, 0.0);
        }
        rotatedPosition -= vec3(0.0, 0.0, 1.0);
        rotatedPosition = rayRotate(rotatedPosition, 1.0, sf);
    }
    float leafDist = min(
      sf * sdBox(rotatedPosition, vec3(0.03, 1.3, 2.0)),
      sf * sdBox(rotatedPosition, vec3(1.3, 0.03, 2.0))
    );
    if (dist > leafDist) {
        dist = leafDist;
        color = vec3(0.2, 0.7, 0.1);
    }
  
    background = false;
    roughness = 0.0;
  
    if (dist > abs(position.z)) {
        dist = abs(position.z);
        color = vec3(0.1, 0.4, 0.1);
    }

    return dist;
}