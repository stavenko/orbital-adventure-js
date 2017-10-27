#include <lodUtils>
const vec2 textureResolution = vec2(512.0); 
struct TileProperties{
  int face;
  int lod;
  int tile;
  int J, I;
  int division;
  float s,t;
};
/*
void calculateTileProperties(int face, int lod, int tileJ, int tileI, out TileProperties tp){
  float division = pow(2., float(lod));
  tp.face = face;
  tp.lod = lod;
  tp.tile = tileJ * division + tileI;
  tp.J = tileJ;
  tp.I = tileI;
  tp.division = int(floor(division));
  tp.s = float(tp.J) / float(division);
  tp.t = float(tp.I) / float(division);
}*/

void calculateTileProperties(int face, int lod, int tile, out TileProperties tp){
  float division = pow(2., float(lod));
  tp.face = face;
  tp.lod = lod;
  tp.tile = tile;
  tp.J = tile / int(division);
  tp.I = int(mod(float(tile), division));
  tp.division = int(floor(division));
  tp.s = float(tp.J) / float(division);
  tp.t = float(tp.I) / float(division);
}

vec3 uvToNormal(vec2 uv, int face){

  float s = uv.x;
  float t = uv.y;

  float ss = s * 2.0 - 1.0;
  float tt = t * 2.0 - 1.0;

  if(face == 0) return vec3(-1.0, -tt, ss);// back
  if(face == 1) return vec3(ss, -1.0, -tt); // left
  if(face == 2) return vec3(1.0, -tt,-ss); // front
  if(face == 3) return vec3(ss,  1.0, tt); // right
  if(face == 4) return vec3(ss, -tt, 1.0); // top
  if(face == 5) return vec3(-ss, -tt, -1.0); // bottom
  return vec3(0.0);
}
vec3 stToNormal(vec2 st, int face){

  float ss = st.x;
  float tt = st.y;

  if(face == 0) return vec3(-1.0, -tt, ss);// back
  if(face == 1) return vec3(ss, -1.0, -tt); // left
  if(face == 2) return vec3(1.0, -tt,-ss); // front
  if(face == 3) return vec3(ss,  1.0, tt); // right
  if(face == 4) return vec3(ss, -tt, 1.0); // top
  if(face == 5) return vec3(-ss, -tt, -1.0); // bottom
  return vec3(0.0);
}

vec3 stToNormal(vec2 st, int lod, int tileJ, int tileI, int face) {
  float division = pow(2., float(lod));
  float S = float(tileJ) / division;
  float T = float(tileI) / division;
  vec2 ST = vec2(S, T) + st2uv(st) / division;
  return stToNormal(ST, face);
}

vec3 calculateNormal(vec3 basisS, vec3 basisT, vec2 st, int face, float radius, float horizont){
  vec3 gridPointNormal = normalize(stToNormal(textureCenter, face));
  vec3 sphereSurfacePoint = gridPointNormal * radius;

  vec3 spherePlaneShift = textureHorizont * (basisS * st.x + basisT * st.y);
  vec3 sphereShiftedPoint = sphereSurfacePoint + spherePlaneShift;

  float spherePlaneDistance = length(st) * textureHorizont;
  vec3 rotationAxis = normalize(cross(sphereSurfacePoint, sphereShiftedPoint));

  float planeArcAngle = spherePlaneDistance / radius;
  vec4 rotationalQuat = fromAxisAngle(rotationAxis, planeArcAngle);
  return rotate(gridPointNormal, rotationalQuat);
}

vec3 calculateHeightNormal(int face, int lod, int tileJ, int tileI, vec2 glFragCoords){
  vec2 uv = glFragCoords / textureResolution;
  float division = pow(2.0, float(lod));
  float S = float(tileJ) / division;
  float T = float(tileI) / division;
  uv /= vec2(float(division));
  uv += vec2(S, T);

  return  stToNormal(uv, face);
}
vec3 calculateHeightNormal(int face, int lod, int tileJ, int tileI, int hTile, bool
    halfResolution, vec2 glFragCoords){

  vec2 shift = vec2(0.0);
  if(hTile == 1) shift = vec2(0.0, 0.5);
  if(hTile == 2) shift = vec2(0.5, 0.0);
  if(hTile == 3) shift = vec2(0.5, 0.5);
  vec2 fbResolution = textureResolution / 2.0;
  if(halfResolution)
    fbResolution /= 2.0;

  vec2 uv = glFragCoords / (fbResolution) / 2.0;
  // this is current 4-component 256 - texture
  uv += shift; // This is tile-related uv
  // Since our textures is 512 size, and hieghtmap is packed 
  // - we have to add shifting coords
  
  // Now we need face-related uv
  // We must to divide in-face uvs on division
  // and add tilestart uvs;
  // TileProperties tp;
  // calculateTileProperties(face, lod, tile, tp);
  float division = pow(2.0, float(lod));
  float S = float(tileJ) / division;
  float T = float(tileI) / division;


  uv /= vec2(division);
  uv += vec2(S, T);

  return  stToNormal(uv, face);
}
