#version 300 es

precision highp float;

in vec2 in_position;
out vec4 fragColor;

uniform sampler2D inputImage;
uniform sampler2D inputNormal;
uniform sampler2D inputAlbedo;
uniform sampler2D inputPosition;

uniform float gamma;

float normalDist(float x, float mu, float sigma) {
  return 1.0 / (sigma * sqrt(2.0 * 3.14159265358979323)) * pow(exp(-0.5 * (x - mu) / sigma), 2.0);
}

void main() {
  vec2 texcoord = in_position * 0.5 + 0.5;

  vec3 normalAverages = vec3(0.0, 0.0, 0.0);
  vec3 positionAverages = vec3(0.0);
  for (float y = -8.0; y < 8.0; y++) {
    for (float x = -8.0; x < 8.0; x++) {
      vec2 samplePos = texcoord + vec2(x, y) / vec2(textureSize(inputImage, 0));
      normalAverages += texture(inputNormal, samplePos).rgb;
      positionAverages += texture(inputPosition, samplePos).rgb;
    }
  }
  normalAverages /= 225.0;
  positionAverages /= 225.0;
  vec3 normalVariances = vec3(0.0, 0.0, 0.0);
  vec3 positionVariances = vec3(0.0, 0.0, 0.0);
  for (float y = -8.0; y < 8.0; y++) {
    for (float x = -8.0; x < 8.0; x++) {
      vec2 samplePos = texcoord + vec2(x, y) / vec2(textureSize(inputImage, 0));
      vec3 errorNormal = normalAverages - texture(inputNormal, samplePos).rgb;
      vec3 errorPosition = positionAverages - texture(inputPosition, samplePos).rgb;
      normalVariances += errorNormal * errorNormal;
      positionVariances += errorPosition * errorPosition;
    }
  }
  normalVariances /= 225.0;
  positionVariances /= 225.0 * length(positionAverages)* length(positionAverages);

  float sigma = max(0.25, 0.03 / (0.00001 + length(normalVariances)));

  vec3 avgRGB = vec3(0.0);
  float normalDistAccumulation = 0.0;
  for (float y = -8.0; y < 8.0; y++) {
    for (float x = -8.0; x < 8.0; x++) {
      float normalDistSample = normalDist(length(vec2(x, y)), 0.0, sigma);
      normalDistAccumulation += normalDistSample;
      avgRGB += 
        normalDistSample
        * min(vec3(1.0), texture(inputImage, texcoord + vec2(x, y) / vec2(textureSize(inputImage, 0))).rgb);
    }
  }
  //fragColor = vec4(10.0 * length(positionVariances), 10.0 * length(normalVariances), 0.0, 1.0);
  //fragColor = vec4(vec3(sigma), 1.0);
  
  //fragColor = vec4(vec3(sigma))

  fragColor = vec4(pow(avgRGB / normalDistAccumulation, vec3(gamma)), 1.0);
  
  // if (isinf(avgRGB.r) || isinf(avgRGB.g) || isinf(avgRGB.b)) {
  //   fragColor = vec4(1.0, 0.0, 0.0, 1.0);
  // }
  // // if (avgRGB.r <= 0.0 || avgRGB.g <= 0.0 || avgRGB.b <= 0.0) {
  //   fragColor = vec4(0.0, 1.0, 0.0, 1.0);
  // }

  //vec3 pixel = texture(inputImage, in_position * 0.5 + 0.5).rgb;
  //fragColor = vec4(pixel, 1.0);
  //fragColor = vec4(pow(pixel.r, gamma), pow(pixel.g, gamma), pow(pixel.b, gamma), 1.0);

} 