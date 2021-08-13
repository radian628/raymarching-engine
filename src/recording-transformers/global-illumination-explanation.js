/*
Built-in variables:
renderSettings.url - where to upload each frame
renderSettings.samples - samples to take per frame
renderSettings.partitions - how much to divide the screen while rendering

rec.data - array of frame objects
    each of these contains all the state set during a recording's frame 
*/

const PORT = 42064;
/*
%INDEX% is replaced with the frame index
    e.g. in this case, 
    first frame is frame0.png, 
    second is frame1.png, etc.
Files will be sent with a PUT request.
    Encoding is base64.
    Handle CORS stuff on your server if needed.*/
renderSettings.url = `http://localhost:${PORT}/frame%INDEX%.png`;

//sets the number of samples per pixel per frame
//higher values will reduce noise
renderSettings.samples = 128;

//sets the number of screen partitions on both axes 
//(useful if rendering the entire screen is computationally expensive)
renderSettings.partitions = 4;

/*
For each frame, set some of the shader parameters.
Redundant changes to shader state will be deleted automatically.*/
rec.data.forEach((frame, frameIndex) => {
    frame.reflections = 4;
    frame.uShadowBrightness = 0.0;
    frame.uAOStrength = 0.0;
  
    frame.additiveBlending = true;
    frame.uBlendFactor = 0.01;

    frame.raymarchingSteps = 128;
    frame.resolution = [1920, 1080];
  
    if (frameIndex != 0) {
        frame.uMotionBlurPrevPos = rec.data[frameIndex - 1].uPosition;
        frame.uMotionBlurPrevRot = rec.data[frameIndex - 1].rotation;
    }
});