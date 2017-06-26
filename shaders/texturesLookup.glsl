vec4 texture(sampler2D t, vec2 uv){
  return texture2D(t, uv);
}

vec4 textureLookup(sampler2D t, vec4 uvwz);

vec4 texture(sampler2D t, vec4 uvwz){
#ifdef USE_INTERPOLATED
  // return texture_interpolated(t, uvwz);
#else
  return textureLookup(t, uvwz);
#endif
}

vec4 texture(sampler2D t, vec3 uvw){
  float layer = floor(( uvw.z )  * 32.0);
  float cy = floor(layer / 4.0) / 8.0;
  float cx = floor(mod(layer, 4.0)) / 4.0;

  vec2 uv = uvw.xy / vec2(4.0, 8.0);

  vec2 shift = vec2(cx, cy);
  
  uv += shift;
  
#ifdef MESS
  //float l = uvw.z;
  //float cy_ = floor(layer / 4.0) / 8.0;
  //float cx_ = mod(layer, 4.0) / 4.0;
  //vec2 shift_ = vec2(cx_/ 4.0, cy_);
  return vec4(uvw.xyz, 0.0);
#endif

  return texture2D(t, uv);
}


vec4 texture4D(sampler2D tex, vec2 fragCoords){
  // placeholder

  return texture2D(tex, fragCoords);
}
