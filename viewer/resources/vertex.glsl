#version 300 es

precision highp float;

in vec2 position;

out vec2 in_position;

void main() {
  gl_Position = vec4(position, 0.5, 1.0);
  in_position = position;
}