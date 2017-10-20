uniform sampler2D heightMap;
uniform int lod;

vec3 gc(int i ){
  return vec3(1.0, 0.0, 0.0);

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

void main() {

  vec2 uu = gl_FragCoord.xy / 1000.0;
  vec4 t = texture2D(heightMap, uu);
  gl_FragColor = vec4(gc(lod), 1.0);
}
