#version 300 es

precision highp float;

in vec2 in_position;

layout(location=0) out vec4 fragColor;
layout(location=1) out vec4 normalOut;
layout(location=2) out vec4 albedoOut;
layout(location=3) out vec4 positionOut;

uniform sampler2D inputImage;
uniform sampler2D inputNormal;
uniform sampler2D inputAlbedo;
uniform sampler2D inputPosition;

void main() {
  vec2 texcoord = in_position * 0.5 + 0.5;
  fragColor = texture(inputImage, texcoord);
  normalOut = texture(inputNormal, texcoord);
  albedoOut = texture(inputAlbedo, texcoord);
  positionOut = texture(inputPosition, texcoord);
} 