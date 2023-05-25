#version 300 es

precision highp float;

uniform sampler2D inputImage1;
uniform sampler2D inputImage2;
uniform sampler2D inputImage3;

in vec2 texcoord;
layout(location = 0) out vec4 fragColor1;
layout(location = 1) out vec4 fragColor2;
layout(location = 2) out vec4 fragColor3;

void main(void) {
    fragColor1 = texture(inputImage1, texcoord);
    fragColor2 = texture(inputImage2, texcoord);
    fragColor3 = texture(inputImage3, texcoord);
    //vec4(0.75);
}