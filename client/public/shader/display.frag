#version 300 es

precision highp float;

uniform sampler2D color;
uniform sampler2D normalAndDofRadiusTex;
uniform sampler2D albedoAndDepthTex;

uniform float brightness;

in vec2 texcoord;
out vec4 fragColor;

#define PI 3.1415926535

float gaussianBlurFactor(vec2 offset, float sigma) {
    return 1.0 / (2.0 * PI * sigma * sigma) * exp(-(dot(offset, offset) / (2.0 * sigma * sigma)));
}

void main(void) {
    vec4 colorSample = texture(color, texcoord);

    vec4 normalAndDofRadius = texture(normalAndDofRadiusTex, texcoord) * brightness;

    float kernelSize = clamp(normalAndDofRadius.w * 200.0, 0.0, 16.0);

    /*
        How do I account for normals with denoising? What I really want to be denoising here
        is sharp corners. So how do I detect sharp corners? A sharp corner is sharper when the 
        gradient changes faster. This is something I can numerically approximate. I already use 
        a few SDF lookups to determine the normal. Can I just use a few more lookups to determine
        how fast the normal changes? Alright this is kinda annoying i might focus more on depth now.
        Depth is a weird one. 
    */

    // // adjust kernel size to account for normal
    // for (float y = -2; y <= 2; y++) {
    //     for (float x = -2 x <= 2; x++) {

    //     }
    // }


    // gaussian filter for DoF
    vec4 avgColorSample = vec4(0.0);
    float sampleCount = 0.0;
    for (float y = -kernelSize; y <= kernelSize; y++) {
        for (float x = -kernelSize; x <= kernelSize; x++) {
            vec2 offset = vec2(x, y);
            vec2 texOffset = offset / vec2(textureSize(color, 0));
            float factor = gaussianBlurFactor(offset, max(kernelSize, 1.0) * 0.3);
            sampleCount += factor;
            avgColorSample += texture(color, texcoord + texOffset) * factor;
        }   
    }

    avgColorSample /= sampleCount;

    fragColor = pow(vec4(vec3(avgColorSample.xyz * brightness), 1.0), vec4(1.0 / 2.2))
     //   + vec4(normalAndDofRadius.w * 200.0, vec3(0.0))
    ;
    
    //fragColor = vec4(vec3(kernelSize * 0.1), 1.0);
}