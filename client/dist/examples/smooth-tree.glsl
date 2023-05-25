
uniform float fractalIterations;
//@name="Fractal Iterations" 
//@min=0 @max=20 @step=1 @sensitivity=0.01 @default=14

uniform float scaleFactor;
//@name="Scale Factor"
//@min=0 @max=1.5 @step=0.001 @sensitivity=0.001 @default=0.7

uniform vec3 angles;
//@name="Angles" @step=0.001 @sensitivity=0.01 @default=2.9,-0.8,0.4

uniform float offset;
//@name="Offset" @step=0.001 @sensitivity=0.01 @default=1.2

uniform int smoothen;
//@name="Smoothen" @format=checkbox @default=1

//credit: https://iquilezles.org/articles/distfunctions/
float opSmoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h); }

float generalUnion(float d1, float d2, float k) {
  if (smoothen == 1) {
    return opSmoothUnion(d1, d2, k);
  } else {
    return min(d1, d2);
  }
}

float sdf(vec3 position) {  
  vec3 transformedPos = position;
  float minDist = 9999.0;
  for (float i = 0.0; i < fractalIterations; i++) {
    float combinedScaleFactor = pow(scaleFactor, i);
    vec3 tpos2 = transformedPos * combinedScaleFactor;
    minDist = generalUnion(
      minDist, 
      sdBox(tpos2, vec3(1.0, 0.1, 0.1) * (combinedScaleFactor)), 
      combinedScaleFactor * 0.25
    );
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