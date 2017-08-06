    //cubemap lookup
    /*
 major axis
      direction     target	            		           sc     tc    ma
      ----------    -------------------------------    ---    ---   ---
       +rx	        TEXTURE_CUBE_MAP_POSITIVE_X_ARB    -rz    -ry   rx
       -rx	        TEXTURE_CUBE_MAP_NEGATIVE_X_ARB    +rz    -ry   rx

       +ry	        TEXTURE_CUBE_MAP_POSITIVE_Y_ARB    +rx    +rz   ry
       -ry	        TEXTURE_CUBE_MAP_NEGATIVE_Y_ARB    +rx    -rz   ry
       +rz	        TEXTURE_CUBE_MAP_POSITIVE_Z_ARB    +rx    -ry   rz
       -rz	        TEXTURE_CUBE_MAP_NEGATIVE_Z_ARB    -rx    -ry   rz

      s   =	( sc/|ma| + 1 ) / 2
      t   =	( tc/|ma| + 1 ) / 2
     */
float heightMapLookup(sampler2D map, vec2 uv, bool a){
  vec4 texel = texture2D(map, uv);
  return texel.r;
}

vec2 getHeightUV(vec2 uv){
  return mod(uv*vec2(2.0), vec2(1.0));
}
float texelLookup(vec4 texel, vec2 uv){
  float x = floor(uv.x / 0.5);
  float y = floor(uv.y / 0.5);
  int t = int(x*2.0 + y);
  if(t == 0) return texel.x;
  if(t == 1) return texel.y;
  if(t == 2) return texel.z;
  if(t == 3) return texel.w;
}

float heightMapLookup(sampler2D map, vec2 uv){
  vec2 nuv = getHeightUV(uv);
  vec4 texel = texture2D(map, nuv);
  return texelLookup(texel,uv);
}

int calculateTile(vec2 tileCoords, int lod){
  float division = pow(2.0, float(lod));
  float tile = tileCoords.y * division + tileCoords.x;
  return int(tile);

}

vec2 tileCoordsToFaceCoords(vec2 tile, vec2 tileCoords, int lod){
  float division = pow(2.0, float(lod));
  return tile / division + tileCoords / division;
}

vec2 findTile(vec2 st,  int lod){
  // int face = determineFace(normal);
  // vec2 st = getSt(normal, face);
  float division = pow(2.0, float(lod));
  
  float J = floor(st.x * division);
  float I = floor(st.y * division);
  return vec2(I,J);
  // float tile = J * division + I;
  // return int(tile);
}

int determineFace(vec3 n){
  float ax = abs(n.x);
  float ay = abs(n.y);
  float az = abs(n.z);

  if(ay > ax && ay > az){
    if(n.y > 0.0) return 3;
    else return 1;
  } 

  if(ax > ay && ax > az){
    if(n.x > 0.0) return 2;
    else return 0;
  }

  if(az > ay && az > ax){
    if(n.z > 0.0) return 4;
    else return 5;
  }
}

vec2 uv2st(vec2 uv){
  return uv * vec2(2.0) - vec2(1.0); // (st + vec2(1.0)) * vec2(0.5)
}
vec2 st2uv(vec2 st){
  return (st + vec2(1.0)) * vec2(0.5);
}

vec2 getSt(vec3 n, int f){
  
  if(f == 2) return vec2(-n.z/ abs(n.x), -n.y/abs(n.x)); // +x
  if(f == 0) return vec2(n.z/ abs(n.x), -n.y/abs(n.x)); 

  if(f == 4) return vec2(n.x/ abs(n.z), -n.y/abs(n.z)); // +z
  if(f == 5) return vec2(-n.x/ abs(n.z), -n.y/abs(n.z)); 

  if(f == 3) return vec2(n.x/ abs(n.y), n.z/abs(n.y)); // +y
  if(f == 1) return vec2(n.x/ abs(n.y), -n.z/abs(n.y)); 
}

