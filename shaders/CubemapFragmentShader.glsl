uniform samplerCube cubemap;
uniform float id;
varying vec3 _normal;
#define PI 3.141592653589793

vec4 texelLookup(vec3 normal){
  float phi = asin(normal.y);
  float lambda = atan(normal.x, normal.z)+PI;
  if(phi > 0.0 && phi > PI/4. ) return vec4(1.0,0.0,0.0,1.0);
  if(phi < 0.0 && phi < -PI/4. ) return vec4(0.0,0.0,1.0,1.0);

  if(lambda < PI/2. && lambda > 0.0) return vec4(1.0, 1.0, 0.0, 1.0);
  if(lambda > PI/2. && lambda < PI) return vec4(1.0, 0.0, 1.0, 1.0);

  if(lambda > PI && lambda < 3.0*PI/2.0) return vec4(0.0, 1.0, 1.0, 1.0);
  if(lambda > 3.*PI/2. && lambda < 2.*PI) return vec4(0.0, 1.0, 0.0, 1.0);

  return vec4(1.0,1.0,1.0,1.0);
}

int texelLookupi(vec3 normal){
  float phi = asin(normal.y);
  float lambda = atan(normal.x, normal.z)+PI;
  if(phi > 0.0 && phi > PI/4. ) return 0;
  if(phi < 0.0 && phi < -PI/4. ) return 1;

  if(lambda < PI/2. && lambda > 0.0) return 2;
  if(lambda > PI/2. && lambda < PI) return 3;

  if(lambda > PI && lambda < 3.0*PI/2.0) return 4;
  if(lambda > 3.*PI/2. && lambda < 2.*PI) return 5;

}

void main(){
  int f = texelLookupi(_normal);
  vec4 t = textureCube(cubemap, _normal);

  int plane = int(t.r);
  t.a = 0.5;
  gl_FragColor = t;
  

}

