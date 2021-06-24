float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic) {
    metallic = false;
    roughness = 0.0;
    color = position;
    return length(position) - 1.0;
}