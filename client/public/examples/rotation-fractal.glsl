
uniform float fractalIterations;
//@name="Fractal Iterations" 
//@min=0 @max=20 @step=1 @sensitivity=0.01 @default=14

uniform float scaleFactor;
//@name="Scale Factor"
//@min=0 @max=1.5 @step=0.001 @sensitivity=0.001 @default=0.5

uniform vec3 angles;
//@name="Angles" @step=0.001 @sensitivity=0.01 @default=0.4,0.4,0.4

uniform float offset;
//@name="Offset" @step=0.001 @sensitivity=0.01 @default=1.2

float sdf(vec3 position) {  
  vec3 transformedPos = position;
  for (float i = 0.0; i < fractalIterations; i++) {
     transformedPos /= scaleFactor;
     transformedPos = abs(transformedPos) - vec3(offset);
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
  float combinedScaleFactor = pow(scaleFactor, round(fractalIterations));
  transformedPos *= combinedScaleFactor;
  float minDist = sdBox(transformedPos, vec3(combinedScaleFactor));
  return minDist;
}