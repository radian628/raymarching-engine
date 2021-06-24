#version 300 es

in highp vec2 aVertexPosition;

out vec2 vTexCoord;

void main() {
    vTexCoord = aVertexPosition * 0.5 + 0.5;
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);
}