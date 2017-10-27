precision highp float;
uniform int face;
uniform vec2 textureCenter;
uniform vec3 basisS;
uniform vec3 basisT;
uniform float textureHorizont;
uniform float radius;
uniform sampler2D permutationTable;
uniform vec2 permutationTableSize;

#define TEXTURE_RESOLUTION 512.0

#include <quaternion>
#include <getHeightValue>
#include <calculateNormal>

void main(){
  vec2 screenCoordUV = gl_FragCoord.xy / TEXTURE_RESOLUTION;
  vec2 screenCoordST = screenCoordUV * 2.0 - vec2(1.0, 1.0);
  vec3 n = calculateNormal(basisS, basisT, screenCoordST, face, radius, textureHorizont);
  float h = getHeightValue(n,  permutationTable, permutationTableSize);
  gl_FragColor = vec4(h > 0.5 ? 1.0: 0.0, screenCoordUV, 1.0);
}
