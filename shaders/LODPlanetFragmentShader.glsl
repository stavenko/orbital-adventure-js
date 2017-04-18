uniform sampler2D colorMap;
uniform sampler2D specularMap;
uniform sampler2D normalMap;
uniform sampler2D heightMap;

uniform float lod;
uniform float division;
uniform vec2 samplerStart;
uniform float fface;

uniform vec3 someColor;
varying vec3 sphereNormal;
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
vec2 getSt(vec3 n, int f){
  
  if(f == 2) return vec2(-n.z/ abs(n.x), -n.y/abs(n.x)); 
  if(f == 0) return vec2(n.z/ abs(n.x), -n.y/abs(n.x)); 

  if(f == 4) return vec2(n.x/ abs(n.z), -n.y/abs(n.z)); 
  if(f == 5) return vec2(-n.x/ abs(n.z), -n.y/abs(n.z)); 

  if(f == 3) return vec2(n.x/ abs(n.y), n.z/abs(n.y)); 
  if(f == 1) return vec2(n.x/ abs(n.y), -n.z/abs(n.y)); 
}

bool isWithinUV(vec2 st){
  vec2 samplerEnd = samplerStart + vec2(1.0/division, 1.0/division);
  bool x = st.x < samplerStart.x;
  bool y = st.y < samplerStart.y;
  if((st.x < samplerStart.x) || (st.x > samplerEnd.x) ||
      (st.y < samplerStart.y) || (st.y > samplerEnd.y)) 
    return false;
  return true;
}

vec2 getHeightUV(vec2 uv){
  return mod(uv*vec2(2.0), vec2(1.0));
}


float texelLookup(vec4 texel, vec2 uv){
  float x = floor(uv.x / 0.5);
  float y = floor(uv.y / 0.5);
  int t = int(x*2.0 + y);
  if(t == 0) return texel.x;
  if(t == 1) return 0.0;//texel.y;
  if(t == 2) return 0.0;//texel.z;
  if(t == 3) return 0.0;//texel.w;
}

void main(){
  int face = int(fface);
  int nFace = determineFace(sphereNormal);

  if(nFace == face){

    vec2 st = (getSt(sphereNormal, face) + vec2(1.0,1.0)) / vec2(2.0,2.0);
    if(!isWithinUV(st)){
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.00);
      return;
    }

    
    vec2 uv = mod(st, vec2(1.0/division)) / vec2(1.0/division);

    vec2 nuv = getHeightUV(uv);
    vec4 texel = texture2D(heightMap, nuv);
    //gl_FragColor = vec4(nuv, 0.0, 1.0);
    gl_FragColor = vec4(vec3(texel.x), 1.0);
    //gl_FragColor = vec4(vec3((texelLookup(texel,uv)+1.0) /2.0), 1.0);
  }else{
    gl_FragColor = vec4(0.0, 0.0 , 0.0, 0.0);
  // discard;
  }
}
