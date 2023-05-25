#version 300 es

precision highp float;

in vec2 vertex_position;
out vec2 texcoord;

void main(void) {
    gl_Position = vec4(vertex_position, 0.0, 1.0);
    texcoord = vertex_position * 0.5 + 0.5;
}