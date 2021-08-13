#version 300 es

//REPLACEHERE

precision highp float;

in vec2 vTexCoord;
layout(location = 0) out vec4 fragColor;

uniform sampler2D src;
uniform sampler2D sampleCounts;
uniform sampler2D normal;
uniform sampler2D albedo;

uniform float uSigma;
uniform float uSigmaCoefficient;
uniform float uSharpeningThreshold;


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Copyright (c) 2018-2019 Michele Morrone
//  All rights reserved.
//
//  https://michelemorrone.eu - https://BrutPitt.com
//
//  me@michelemorrone.eu - brutpitt@gmail.com
//  twitter: @BrutPitt - github: BrutPitt
//  
//  https://github.com/BrutPitt/glslSmartDeNoise/
//
//  This software is distributed under the terms of the BSD 2-Clause license
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

#define INV_SQRT_OF_2PI 0.39894228040143267793994605993439  // 1.0/SQRT_OF_2PI
#define INV_PI 0.31830988618379067153776752674503

//  smartDeNoise - parameters
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//
//  sampler2D tex     - sampler image / texture
//  vec2 uv           - actual fragment coord
//  float sigma  >  0 - sigma Standard Deviation
//  float kSigma >= 0 - sigma coefficient 
//      kSigma * sigma  -->  radius of the circular kernel
//  float threshold   - edge sharpening threshold 

float denoiseStep = 1.0;

vec4 smartDeNoise(sampler2D tex, sampler2D normalTex, sampler2D albedoTex, vec2 uv, float sigma, float kSigma, float threshold)
{
    float radius = round(kSigma*sigma);
    float radQ = radius * radius;

    float invSigmaQx2 = .5 / (sigma * sigma);      // 1.0 / (sigma^2 * 2.0)
    float invSigmaQx2PI = INV_PI * invSigmaQx2;    // 1/(2 * PI * sigma^2)

    float invThresholdSqx2 = .5 / (threshold * threshold);     // 1.0 / (sigma^2 * 2.0)
    float invThresholdSqrt2PI = INV_SQRT_OF_2PI / threshold;   // 1.0 / (sqrt(2*PI) * sigma^2)

    vec4 centrPx = texture(tex,uv);
    vec4 centrPxNormal = texture(normalTex,uv);
    vec4 centrPxAlbedo = texture(albedoTex,uv);
    //centrPx.rgb = min(centrPx.rgb, 1.0);

    float zBuff = 0.0;
    vec4 aBuff = vec4(0.0);
    vec2 size = vec2(textureSize(tex, 0));

    vec2 d;
    for (d.x=-radius; d.x <= radius; d.x+=denoiseStep) {
        float pt = sqrt(radQ-d.x*d.x);       // pt = yRadius: have circular trend
        for (d.y=-pt; d.y <= pt; d.y+=denoiseStep) {
            float blurFactor = exp( -dot(d , d) * invSigmaQx2 ) * invSigmaQx2PI;

            vec4 walkPx =  texture(tex,uv+d/size);
            vec4 walkPxNormal =  texture(normalTex,uv+d/size);
            vec4 walkPxAlbedo =  texture(albedoTex,uv+d/size);
            //walkPx.rgb = min(walkPx.rgb, 50.0);
            vec4 dC = walkPx-centrPx + walkPxNormal - centrPxNormal + walkPxAlbedo - centrPxAlbedo;
            float deltaFactor = exp( -dot(dC, dC) * invThresholdSqx2) * invThresholdSqrt2PI * blurFactor;

            zBuff += deltaFactor;
            aBuff += deltaFactor*walkPx;
        }
    }
    return aBuff/zBuff;
}

vec3 colorCurve(vec3 col) {
    //return -1.0 / (col + 1.0) + 1.0;
    return pow(col, vec3(1.0/2.2));
}

void main() {
    float sampleFactor = float(texture(sampleCounts, vTexCoord).r) + 1.0;
    #ifdef DENOISE
    vec3 rgb = smartDeNoise(src, normal, albedo, vTexCoord, uSigma / min(sqrt(sampleFactor), 1.0), uSigmaCoefficient, uSharpeningThreshold).rgb;
    #else
    vec3 rgb = texture(src, vTexCoord).rgb;
    //rgb.r = float(texture(sampleCounts, vTexCoord).r) / 256.0;
    #endif

    //float sampleFactor = 1.0;

    fragColor = vec4(colorCurve(rgb), 1.0);
    //fragColor = vec4(texture(albedo, vTexCoord).rgb, 1.0);
}