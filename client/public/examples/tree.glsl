
uniform float fractalIterations;
//@name="Fractal Iterations" 
//@min=0 @max=20 @step=1 @sensitivity=0.01 @default=8

uniform float scaleFactor;
//@name="Scale Factor"
//@min=0 @max=1.5 @step=0.001 @sensitivity=0.001 @default=0.7

uniform vec3 angles;
//@name="Angles" @step=0.001 @sensitivity=0.01 @default=2.9,-0.8,0.4

uniform float offset;
//@name="Offset" @step=0.001 @sensitivity=0.01 @default=1.2

float sdf(vec3 position) {  
  vec3 transformedPos = position;
  float minDist = 9999.0;
  for (float i = 0.0; i < fractalIterations; i++) {
    float combinedScaleFactor = pow(scaleFactor, i);
    vec3 tpos2 = transformedPos * combinedScaleFactor;
    minDist = min(minDist, sdBox(tpos2, vec3(1.0, 0.1, 0.1) * (combinedScaleFactor)));
     transformedPos /= scaleFactor;
     transformedPos = abs(transformedPos) - vec3(1.0, 0.1, 0.1) * vec3(offset);
     transformedPos.xy *= mat2(
        cos(angles.x), -sin(angles.x), sin(angles.x), cos(angles.x)
     );
     transformedPos.yz *= mat2(
        cos(angles.y), -sin(angles.y), sin(angles.y), cos(angles.y)
     );
     transformedPos.xz *= mat2(
        cos(angles.z), -sin(angles.z), sin(angles.z), cos(angles.z)
     );
  }
  return minDist;
}