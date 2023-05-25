
uniform float bigSphereSize;
//@name="Big Sphere Size" 
//@min=0 @step=0.001 @sensitivity=0.001 @default=4
//@tooltip="Size of the big sphere that bounds the fractal."

uniform float fractalIterations;
//@name="Fractal Iterations" 
//@min=0 @max=20 @step=1 @sensitivity=0.01 @default=8
//@tooltip="Number of sphere grids in the fractal."

uniform float gridScaleFactor;
//@name="Grid Scale Factor"
//@min=0 @max=1 @step=0.001 @sensitivity=0.0003 @default=0.33333333333
//@tooltip="Factor by which successive sphere grids are scaled."

uniform vec3 bigSphereCenter;
//@name="Big Sphere Center"
//@step=0.001 @sensitivity=0.01 @default=0,0,10
//@tooltip="Center of the big sphere that bounds the fractal."
//@format=position/numerical

float sdf(vec3 position) {  
  float minDist = 9999.9;
  for (float i = -1.0; i < fractalIterations; i++) {
      float sf = pow(gridScaleFactor, i);
      vec3 d = abs(mod(position + vec3(0.5 * sf), sf)
         - vec3(sf / 2.0)) - vec3(sf / 3.0);
      float dist = length(d) - 0.21 * sf;
      minDist = min(dist, minDist);
  }
  minDist = max(length(position - bigSphereCenter) - bigSphereSize, -minDist);
  return minDist;
}