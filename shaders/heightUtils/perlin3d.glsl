




float fade(float t){
  return t*t*t*(t*(t*6.0-15.0)+10.0); 
}

float lookUp(sampler2D tex, float ix, vec2 dims_){
  ix = 512.0 - ix;
  vec2 dims = vec2(32.0, 16);

  float x = floor(ix / dims.y);
  float y = mod(ix, dims.y);
  vec2 uv = vec2(x,y) / dims;
  vec4 tx = texture2D(tex, uv);
  return tx.g;
}

float permute(sampler2D t, vec2 d, vec3 xyz){
  float i1 = xyz.z;
  float v1 = lookUp(t, i1, d);
  float i2 = xyz.y + v1;
  float v2 = lookUp(t, i2, d);
  float i3 = xyz.x + v2;
  float v  = lookUp(t, i3, d);
  return mod(v, 12.0);

}

vec3 grad3(int i){
  if(i == 0) return vec3(1.0, 1, 0);
  if(i == 1) return vec3(-1.0, 1, 0);
  if(i == 2) return vec3(1.0, -1, 0);
  if(i == 3) return vec3(-1.0, -1, 0);
  if(i == 4) return vec3(1.0, 0, 1);
  if(i == 5) return vec3(-1.0, 0, 1);
  if(i == 6) return vec3(1.0, 0, -1);
  if(i == 7) return vec3(-1.0, 0, -1);
  if(i == 8) return vec3(0.0, 1, 1);
  if(i == 9) return vec3(0.0, -1, 1);
  if(i == 10) return vec3(0.0, 1, -1);
  if(i == 11) return vec3(0.0, -1, -1);
  return vec3(0.0);
}

float getPerlinValue(sampler2D perm, vec2 permSize, vec3 normal){
  // Find unit grid cell containing point 
  float X = floor(normal.x); 
  float Y = floor(normal.y); 
  float Z = floor(normal.z); 
  
  // Get relative xyz coordinates of point within that cell 
  float x = normal.x - X; 
  float y = normal.y - Y; 
  float z = normal.z - Z; 

  // Wrap the integer cells at 255 (smaller integer period can be introduced here) 
  //X = mod(X, 256.); 
  //Y = mod(Y, 256.); 
  //Z = mod(Z, 256.);
  
  // Calculate a set of eight hashed gradient indices 
  int gi000 = int(permute(perm, permSize, vec3(X, Y, Z))); 
  int gi001 = int(permute(perm, permSize, vec3(X, Y, Z + 1.0))); 
  int gi010 = int(permute(perm, permSize, vec3(X, Y + 1.0, Z))); 
  int gi011 = int(permute(perm, permSize, vec3(X, Y + 1.0, Z + 1.0))); 
  int gi100 = int(permute(perm, permSize, vec3(X+1.0, Y, Z))); 
  int gi101 = int(permute(perm, permSize, vec3(X+1.0, Y, Z + 1.0))); 
  int gi110 = int(permute(perm, permSize, vec3(X+1.0, Y + 1.0, Z))); 
  int gi111 = int(permute(perm, permSize, vec3(X+1.0, Y + 1.0, Z + 1.0))); 

  // int gi001 = int(mod(float(perm[X+perm[Y+perm[Z+1]]]), 12.)); 
  // int gi010 = int(mod(float(perm[X+perm[Y+1+perm[Z]]]), 12.)); 

  //int gi011 = int(mod(float(perm[X+perm[Y+1+perm[Z+1]]]), 12.)); 
  //int gi100 = int(mod(float(perm[X+1+perm[Y+perm[Z]]]), 12.)); 
  //int gi101 = int(mod(float(perm[X+1+perm[Y+perm[Z+1]]]), 12.)); 
  //int gi110 = int(mod(float(perm[X+1+perm[Y+1+perm[Z]]]), 12.)); 
  // int gi111 = int(mod(float(perm[X+1+perm[Y+1+perm[Z+1]]]), 12.)); 
  
  // The gradients of each corner are now: 
  // g000 = grad3[gi000]; 
  // g001 = grad3[gi001]; 
  // g010 = grad3[gi010]; 
  // g011 = grad3[gi011]; 
  // g100 = grad3[gi100]; 
  // g101 = grad3[gi101]; 
  // g110 = grad3[gi110]; 
  // g111 = grad3[gi111]; 
  // Calculate noise contributions from each of the eight corners 
  float  n000= dot(grad3(gi000), vec3(x,     y,     z));
  float  n100= dot(grad3(gi100), vec3(x-1.0, y,     z));
  float  n010= dot(grad3(gi010), vec3(x,     y-1.0, z));
  float  n110= dot(grad3(gi110), vec3(x-1.0, y-1.0, z));
  float  n001= dot(grad3(gi001), vec3(x,     y,     z-1.0));
  float  n101= dot(grad3(gi101), vec3(x-1.0, y,     z-1.0));
  float  n011= dot(grad3(gi011), vec3(x,     y-1.0, z-1.0));
  float  n111= dot(grad3(gi111), vec3(x-1.0, y-1.0, z-1.0));
  // Compute the fade curve value for each of x, y, z 
  float  u = fade(x); 
  float  v = fade(y); 
  float  w = fade(z); 
  // float  Interpolate along x the contributions from each of the corners 
  float  nx00 = mix(n000, n100, u); 
  float  nx01 = mix(n001, n101, u); 
  float  nx10 = mix(n010, n110, u); 
  float  nx11 = mix(n011, n111, u); 
  // Interpolate the four results along y 
  float nxy0 = mix(nx00, nx10, v); 
  float nxy1 = mix(nx01, nx11, v); 
  // Interpolate the two last results along z 
  float nxyz = mix(nxy0, nxy1, w); 

  return nxyz; 
}

