precision highp float;
uniform int face;
uniform int lod;
uniform int tile;
uniform int table[256];

#include <getHeightValue>
#include <calculateNormal>
void main(){
  /*
  vec2 fc = gl_FragCoord;
  vec3 rn = calculateHeightNormal(face, lod, tile, 0, fc);
  vec3 gn = calculateHeightNormal(face, lod, tile, 1, fc);
  vec3 bn = calculateHeightNormal(face, lod, tile, 2, fc);
  vec3 an = calculateHeightNormal(face, lod, tile, 3, fc);

  float r = getHeightValue(rn, lod, table);
  float g = getHeightValue(gn, lod, table);
  float b = getHeightValue(bn, lod, table);
  float a = getHeightValue(an, lod, table);
*/
  gl_FragColor = vec4(0.7, 0.7, 0.0, 1.0);

}

