#version 300 es

precision highp float;

in vec2 vTexCoord;
layout(location = 0) out vec4 fragColor;

uniform sampler2D src;

vec3 colorCurve(vec3 col) {
    //return -1.0 / (col + 1.0) + 1.0;
    return pow(col, vec3(1.0/2.2));
}

void main() {
    vec3 rgb = texture(src, vTexCoord).rgb;
    fragColor = vec4(colorCurve(rgb), 1.0);
}