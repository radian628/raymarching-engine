# raymarching-engine

[Try it here!](https://radian628.github.io/raymarching-engine/src/viewer.html)

## About
 WebGL-based 3D rendering engine, primarily designed for 3D fractals **(lots of images below!)**. Supports the following features (among others):
 - Programmable signed-distance-function, color, and material shaders
 - Global illumination
 - Reprojection for realtime global illumination
 - Diffuse, specular, and emissive materials
 - Depth of Field and motion blur
 - Acting as a frame server; can send frame(s) as a .png sequence via HTTP PUT requests, which can then be saved to the disk, piped to FFMPEG, etc.

In order to host this project yourself, you will need to run a web server (rather than opening the file directly) to avoid CORS errors, as browsers treat local files as cross-origin data. If you just want to try it out yourself, [here is the link.](https://radian628.github.io/raymarching-engine/src/viewer.html)

## Example Images
 Some images I created with this rendering engine.
 ![menger sponge fractal](samples/mengersponge1.png)
 ![fractal that looks like swiss cheese but with way too many holes sort of](samples/cheese.png)
 ![grid of cubes](samples/cubes.png)
 ![fractal with light shafts AKA "god rays"](samples/fractalgodrays.png)
 ![tree fractal](samples/tree0.png)
 ![fractal that looks a bit like office buildings](samples/office.png)