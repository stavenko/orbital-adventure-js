const vec2 textureResolution = vec2(512.0); 
struct TileProperties{
  int face;
  int lod;
  int tile;
  int J, I;
  int division;
  float s,t;
};

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
vec3 stToNormal(vec2 st, int face){

  float s = st.x;
  float t = st.y;

  float ss = s * 2.0 - 1.0;
  float tt = t * 2.0 - 1.0;

  if(face == 0) return vec3(-1.0, -tt, ss);// back
  if(face == 1) return vec3(ss, -1.0, -tt); // left
  if(face == 2) return vec3(1, -tt,-ss); // front
  if(face == 3) return vec3(ss,  1, tt); // right
  if(face == 4) return vec3(ss, -tt, 1); // top
  if(face == 5) return vec3(-ss, -tt, -1); // bottom
  return vec3(0.0);
}

vec3 calculateHeightNormal(int face, int lod, int tile, vec2 glFragCoords){
  vec2 uv = glFragCoords / textureResolution ;
  TileProperties tp;
  calculateTileProperties(face, lod, tile, tp);
  uv /= vec2(float(tp.division));
  uv += vec2(tp.s, tp.t);

  return  stToNormal(uv, face);

}
vec3 calculateHeightNormal(int face, int lod, int tile, int hTile, vec2 glFragCoords){

  vec2 shift = vec2(0.0);
  if(hTile == 1) shift = vec2(0.0, 0.5);
  if(hTile == 2) shift = vec2(0.5, 0.0);
  if(hTile == 3) shift = vec2(0.5, 0.5);

  vec2 uv = glFragCoords / (textureResolution / 2.0) / 2.0;
  // this is current 4-component 256 - texture
  uv += shift; // This is tile-related uv
  // Since our textures is 512 size, and hieghtmap is packed 
  // - we have to add shifting coords
  
  // Now we need face-related uv
  // We must to divide in-face uvs on division
  // and add tilestart uvs;
  TileProperties tp;
  calculateTileProperties(face, lod, tile, tp);

  uv /= vec2(float(tp.division));
  uv += vec2(tp.s, tp.t);

  return  stToNormal(uv, face);
}
