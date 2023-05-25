
uniform float fractalIterations;
//@name="Fractal Iterations" 
//@min=0 @max=20 @step=1 @sensitivity=0.01 @default=8

float sdf(vec3 position) {  
  float minDist = sdBox(position + vec3(0.5), vec3(0.5));
  for (float i = 1.0; i < fractalIterations; i++) {
     float sf = pow(0.33333333333333, i);
     vec3 gridPosition = mod(position, sf*3.0) - sf * 1.5;
     minDist = max(
       minDist,
       -min(
       min(
         sdBox(gridPosition, vec3(sf*1.51, sf*0.5, sf*0.5)),
         sdBox(gridPosition, vec3(sf*0.5, sf*1.51, sf*0.5))
       ),
         sdBox(gridPosition, vec3(sf*0.5, sf*0.5, sf*1.51)) 
       )
     );
  }
  return minDist;
}