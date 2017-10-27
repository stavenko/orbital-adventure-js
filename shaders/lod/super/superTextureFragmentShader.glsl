uniform sampler2D heightMap;
uniform int lod;

varying vec2 textureCoords;
vec3 gc(int i ){

  if(i == 0) return vec3(1.0, 0.0, 0.0);
  if(i == 1) return vec3(0.8, 0.0, 0.0);
  if(i == 2) return vec3(0.6, 0.0, 0.0);
  if(i == 3) return vec3(0.4, 0.0, 0.0);
  if(i == 4) return vec3(0.6, 0.6, 0.6);

  if(i == 5) return vec3(0.0, 1.0, 0.0);
  if(i == 6) return vec3(0.0, 0.8, 0.0);
  if(i == 7) return vec3(0.0, 0.6, 0.0);
  if(i == 8) return vec3(0.0, 0.4, 0.0);
  if(i == 9) return vec3(0.1, 0.1, 0.1);
  if(i == 10)return vec3(0.0, 0.0, 1.0);
  if(i == 11)return vec3(0.0, 0.0, 0.8);
  if(i == 12) return vec3(0.0, 0.0, 0.6);
  return vec3(0.0, 1.0, 1.0);

}

const float px = 3.0;

void main() {
  
  vec4 t = texture2D(heightMap, textureCoords);
  float i = t.r; // (t.r + 1.0) / 2.0 ;
  if(textureCoords.y  >  (2048.0 - px) / 2048.0 || textureCoords.y < px / 2048.0){
    gl_FragColor.rgb = vec3(1.0);
    gl_FragColor.a = 1.0;
    return;
  }
  if(textureCoords.x  >  (2048.0 - px) / 2048.0 || textureCoords.x < px / 2048.0){
    gl_FragColor.rgb = vec3(1.0);
    gl_FragColor.a = 1.0;
    return;
  }

  gl_FragColor = vec4(vec3(i), 1.0);

}
