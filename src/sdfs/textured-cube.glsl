float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic) {
    roughness = 0.0;
    metallic = false;
    vec3 tc = position * 0.5 - vec3(0.5);
    vec3 d = abs(position) - vec3(1.0);
    if (d.z > max(d.x, d.y)) {
        color = texture(img, tc.xy).rgb;
    }
    if (d.y > max(d.x, d.z)) {
        color = texture(img, tc.xz).rgb;
    }
    if (d.x > max(d.z, d.y)) {
        color = texture(img, tc.yz).rgb;
    }
	return max(max(max(d.x, d.y), d.z), 0.0) + min(max(d.x, max(d.y, d.z)), 0.0);
}