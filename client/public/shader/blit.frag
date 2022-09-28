#version 300 es

precision highp float;

uniform sampler2D inputImage;

in vec2 texcoord;
out vec4 fragColor;

void main(void) {
    fragColor = texture(inputImage, texcoord);
}