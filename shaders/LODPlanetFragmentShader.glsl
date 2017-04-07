uniform sampler2D cubicPatch;
uniform float division;
uniform float resolution;
uniform vec2 samplerStart;
uniform float fface;

uniform vec3 someColor;
varying vec3 sphereNormal;
/*
   SAVED;
int determineFace(vec3 n){
  float ax = abs(n.x);
  float ay = abs(n.y);
  float az = abs(n.z);

  if(ay > ax && ay > az){
    if(sphereNormal.y > 0.0) return 1;
    else return 3;
  } 

  if(ax > ay && ax > az){
    if(sphereNormal.x > 0.0) return 0;
    else return 2;
  }

  if(az > ay && az > ax){
    if(sphereNormal.z > 0.0) return 4;
    else return 5;
  }
}
 */
int determineFace(vec3 n){
  float ax = abs(n.x);
  float ay = abs(n.y);
  float az = abs(n.z);

  if(ay > ax && ay > az){
    if(sphereNormal.y > 0.0) return 3;
    else return 1;
  } 


  if(ax > ay && ax > az){
    if(sphereNormal.x > 0.0) return 2;
    else return 0;
  }

  if(az > ay && az > ax){
    if(sphereNormal.z > 0.0) return 4;
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

    vec4 texel = texture2D(cubicPatch, uv);
    gl_FragColor = texel;
  }else{
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  // discard;
  }
}
