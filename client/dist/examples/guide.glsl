// The values of variables can be changed from the settings tab.
uniform float bigSphereSize;
// @name is the display name for the variable (defaults to the variable name) 
//@name="Big Sphere Size" 

// @min and @max control the minimum/maximum value the variable can be
// @step controls the granularity of inputs (e.g. if step=1, only integers are accepted)
// @sensitivity controls how quickly an input changes when clicking and dragging
// @default controls the default value for the input
//      Multiple default values are delimited by commas. Note that spaces will split up
//      these values unless you use quotes!
// @scale determines how the value changes when clicking and dragging
//      It is linear by default, but when set to "log" the input scales logarithmically.
//@min=0 @step=0.001 @sensitivity=0.001 @default=4 @scale=linear

// @tooltip controls the tooltip that appears when hovering over the setting 
//@tooltip="Size of the big sphere that bounds the fractal."

// @format controls the type of input field generated. Valid options are:
//      "numerical" (for direct number inputs)
//      "color" (vec3 only, lets the user select a color)
//      "position" (vec3 only, lets the user select a position in 3D space)
// Multiple formats are delimited by forward slashes ("/" characters)
//      For example, you could use "color/numerical" to give the user both a 
//      color input and a numerical input.
//@format=numerical

uniform vec3 fractalColor;
//@name="Fractal Color"
//@tooltip="Diffuse color of the fractal."
//@default=0.5,0.5,0.5
//@format=color

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

// Diffuse color for the scene as a function of position.
vec3 sceneDiffuseColor(vec3 position) {
  if (length(position) > 35.0) return vec3(0.0);
  return vec3(fractalColor);
}

// Specular/metallic color for the scene.
vec3 sceneSpecularColor(vec3 position) {
  if (length(position) > 35.0) return vec3(0.0);
  return vec3(0.6);
}

// Specular roughness coefficient (ranges 0-1).
float sceneSpecularRoughness(vec3 position) {
  return 0.2;
}

// Subsurface scattering coefficient. Lower values appear translucent and scatter more.
float sceneSubsurfaceScattering(vec3 position) {
  return 11111115.0;
}

// Color for light rays that undergo subsurface scattering.
vec3 sceneSubsurfaceScatteringColor(vec3 position) {
  if (length(position) > 30.0) return vec3(1.0);
  return vec3(1.0);
}

// Index of refraction for fresnel effects.
float sceneIOR(vec3 position) {
  return 100.0;
}

// Light emission strength.
vec3 sceneEmission(vec3 position) {
  float d = max(normalize(position).y, 0.2);
  vec3 brightColor = vec3(0.7, 0.8, 1.0) * d * 1.0;
  return (length(position) > 36.0) ? (brightColor * 2.00) : vec3(0.0);
}

// Signed distance function describing the scene to be drawn.
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