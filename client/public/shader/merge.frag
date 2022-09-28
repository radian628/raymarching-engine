#version 300 es

precision highp float;

uniform sampler2D color1;
uniform sampler2D color2;
uniform float factor;

in vec2 texcoord;
out vec4 fragColor;

void main(void) {
    fragColor = mix(
        texture(color1, texcoord),
        texture(color2, texcoord),
        1.0 + 0.0 * factor
    );
}