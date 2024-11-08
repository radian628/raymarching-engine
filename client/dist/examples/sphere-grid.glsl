
// Diffuse color for the scene as a function of position.
vec3 sceneDiffuseColor(vec3 position) {
  if (length(position) > 35.0) return vec3(0.0);
  return vec3(0.5);
}

// Specular/metallic color for the scene.
vec3 sceneSpecularColor(vec3 position) {
  if (length(position) > 35.0) return vec3(0.0);
  return vec3(0.9);
}

// Specular roughness coefficient (ranges 0-1).
float sceneSpecularRoughness(vec3 position) {
  return 0.01;
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
  float d = max(normalize(position).x, 0.0);
  vec3 brightColor = vec3(0.7, 0.8, 1.0) * d * 1.0;
  return (length(position) > 36.0) ? (brightColor * 2.00) : vec3(0.0);
}

float sd_sphere(vec3 p, float radius, vec3 position) {
  return length(p - position) - radius;
}

float sdf(vec3 p) {  
  vec3 repeat = mod(p + 1.0, vec3(2.0)) - 1.0;
  return sd_sphere(repeat, 0.4, vec3(0.0));
}