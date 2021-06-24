/*
The function globalSDF is a signed distance function (SDF) for some 3D solid (e.g. a cube)
It should return the minimum distance between the 3D solid and any point.
Its parameters are as follows:
- vec3 position:
    This is any position in 3D space 
    for which the minimum distance 
    will be calculated
- out vec3 color:
    This is the color of 
    the object for a given position
- out float roughness:
    This is the metallic roughness 
    for the object at a given position, 
    ranging from 0 to 1.
- out bool metallic:
    This determines whether diffuse 
    or metallic shading will be used.
Calculate the last three parameters assuming
that the parameter position lies near 
the surface of the object (color, roughness, and metallic
are only calculated for the final position of a ray)
*/
float globalSDF(vec3 position, out vec3 color, out float roughness, out bool metallic) {
    //unique index for each cube
    ivec3 index = ivec3(position / 2.0);

    //get color based on cube index
    color = vec3(index) * 0.2 + vec3(0.5);

    //make alternating cubes metallic
    metallic = (index.x + index.y + index.z) % 2 == 0;

    //calculate metallic roughness (increases with positive x);
    roughness = float(index.x) * 0.01;

    //allow cubes to repeat with modulo
    vec3 d = abs(mod(position, 2.0) - vec3(1.0)) - vec3(0.5);

    //calculate final min. distance to cube
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}