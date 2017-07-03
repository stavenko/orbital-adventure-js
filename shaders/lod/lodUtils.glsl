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

