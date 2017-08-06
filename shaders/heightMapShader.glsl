precision highp float;
uniform int face;
uniform int lod;
uniform int tile;
uniform int tileJ;
uniform int tileI;
uniform bool halfResolution;
uniform sampler2D permutationTable;
uniform vec2 permutationTableSize;

#include <getHeightValue>
#include <calculateNormal>

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec3 n = calculateHeightNormal(face, lod, tileJ, tileI, fc);
  vec3 rn = calculateHeightNormal(face, lod, tileJ, tileI, 0, halfResolution, fc);
  vec3 gn = calculateHeightNormal(face, lod, tileJ, tileI, 1, halfResolution, fc);
  vec3 bn = calculateHeightNormal(face, lod, tileJ, tileI, 2, halfResolution, fc);
  vec3 an = calculateHeightNormal(face, lod, tileJ, tileI, 3, halfResolution, fc);

  float fLod = float(lod);

  float r = getHeightValue(rn, fLod, permutationTable, permutationTableSize);
  float g = getHeightValue(gn, fLod, permutationTable, permutationTableSize);
  float b = getHeightValue(bn, fLod, permutationTable, permutationTableSize);
  float a = getHeightValue(an, fLod, permutationTable, permutationTableSize);
  float h = getHeightValue(n, 0.0, permutationTable, permutationTableSize);

  gl_FragColor = vec4(r,g,b,a);

}


