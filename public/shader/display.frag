#version 300 es

precision highp float;

uniform sampler2D inputImage;

in vec2 texcoord;
out vec4 fragColor;

void main(void) {
    fragColor = pow(texture(inputImage, texcoord), vec4(1.0 / 2.2));
}