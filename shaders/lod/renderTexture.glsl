uniform sampler2D colorMap;
uniform sampler2D specularMap;
uniform sampler2D normalMap;
uniform sampler2D heightMap;
uniform vec4 planetRotation;
uniform bool halfResolution;

uniform int lod;
uniform float division;
uniform float radius;
uniform vec2 samplerStart;
uniform float fface;
uniform int shownFaces;
uniform int textureTypeAsColor;

const float planetMaxHeight = 21e3;

uniform vec3 north;
uniform vec3 east;


vec3 lightDirection = normalize(vec3(0.0, 1.0, 0.0));
vec3 oppoDirection = normalize(vec3(0.0, -1.0, 1.0));
#define TEXTURE_SIZE 512.0
#define HEIGHT_TEXTURE_SIZE 256.0

#define PI 3.141592653589793

#include <lodUtils>

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

uniform vec3 someColor;
varying vec3 sphereNormal;
varying vec3 sphereLookupNormal;

vec4 conjugate(vec4 q){
  return vec4(q.xyz * -1.0, q.w);
}

vec4 multiplyQuats(vec4 q1, vec4 q2){
  return vec4(
      q1.w*q2.x + q1.x*q2.w + q1.y * q2.z - q1.z*q2.y,
      q1.w*q2.y - q1.x*q2.z + q1.y * q2.w + q1.z*q2.x,
      q1.w*q2.z + q1.x*q2.y - q1.y * q2.x + q1.z*q2.w,
      q1.w*q2.w - q1.x*q2.x - q1.y * q2.y - q1.z*q2.z
      );
}

vec4 inverseQuat(vec4 quat){
  float n = length(quat);
  return conjugate(quat)/n;
}

vec3 rotate(vec3 v, vec4 q){
  vec4 qpos = vec4(v, 0.0);
  vec4 t = multiplyQuats(q, qpos);
  vec4 qr = multiplyQuats(t, conjugate(q));
  return qr.xyz;
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





float calculatePixelSize(){
  float circleLengthOfRadius = radius * 2.0 * PI;
  return circleLengthOfRadius / 4.0 / division / HEIGHT_TEXTURE_SIZE;

}

vec3 normalFromHeightMap(sampler2D heightMap, vec2 uv){
  vec2 size = vec2(2.0, 0.0);
  vec3 offsetV = vec3(-1.0/HEIGHT_TEXTURE_SIZE, 0.0, 1.0/HEIGHT_TEXTURE_SIZE);
  float h01 = heightMapLookup(heightMap, uv+offsetV.xy);
  float h21 = heightMapLookup(heightMap, uv+offsetV.zy);
  float h10 = heightMapLookup(heightMap, uv+offsetV.yx);
  float h12 = heightMapLookup(heightMap, uv+offsetV.yz);
  float pixelSize = calculatePixelSize();

  vec3 v01 = normalize(sphereLookupNormal * radius + north * pixelSize) +
    (h21-h01) * planetMaxHeight;


  vec3 va = normalize(vec3(size.xy, h21-h01));
  vec3 vb = normalize(vec3(size.yx, h12-h10));
  return cross(va,vb);
  
}

  //[255, 0,0],
  //[255, 255,0],
//
  //[0, 255,0],
  //[0, 255,255], // 3

  //[0, 0,255],
  //[255, 0, 255],

vec4 FaceColor(int f){
  if(f == 0) return vec4(1.0, 0.0, 0.0, 1.0);
  if(f == 1) return vec4(1.0, 1.0, 0.0, 1.0);
  if(f == 2) return vec4(0.0, 1.0, 0.0, 1.0);
  if(f == 3) return vec4(0.0, 1.0, 1.0, 1.0);
  if(f == 4) return vec4(0.0, 0.0, 1.0, 1.0);
  if(f == 5) return vec4(1.0, 0.0, 1.0, 1.0);
}


void main(){

  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  return;

  int face = int(fface);
  int nFace = determineFace(sphereLookupNormal);
  vec3 add = vec3(0.0);

  if(nFace == face){
    if(shownFaces == 0){
      gl_FragColor = vec4(0.0, 0, 0, 0.0);
      return;
    }

    vec2 st = (getSt(sphereLookupNormal, face) + vec2(1.0,1.0)) / vec2(2.0,2.0);
    if(!isWithinUV(st)){
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.00);
      return;
    }

    
    vec2 uv = mod(st, vec2(1.0/division)) / vec2(1.0/division);

    
    float height = heightMapLookup(heightMap, uv);
    //vec3 sphn = -1.0 * sphereLookupNormal;
    //int ff = determineFace(sphn);
    //vec2 uvuv = 0.5 * (getSt(sphn, ff) + 1.0);
    vec3 textureNormal = texture2D(normalMap, uv.yx).xyz*2.0 - 1.0;
    textureNormal = rotate(textureNormal, inverseQuat(planetRotation));

    float light = clamp(dot(textureNormal, lightDirection), 0.0, 1.0);
    float oppoLight = clamp(dot(textureNormal, oppoDirection), 0.0, 1.0)*0.5;
    // float nnn = dot(sphereLookupNormal, lightDirection);
    float pixelDiffuseColor = abs(height); // 0.5*(height + 1.0);
    if(textureTypeAsColor!= 0)
      pixelDiffuseColor = light + oppoLight;

    if(abs(st.x -0.5) < 0.0005 && abs(st.y -0.5) < 0.0005) 
      add = vec3(1., 0.0, 0.0);
    if(abs(uv.x -0.5 ) < 0.01&& abs(uv.y -0.5) < 0.01)
      add += vec3(0.0, 0.0, 1.0);
    if(uv.x < 0.01 || uv.x > 0.99) add += vec3(0.0, 1.0, 0.0);
    if(uv.y < 0.01 || uv.y > 0.99) add += vec3(0.0, 1.0, 0.0);
    
    gl_FragColor = vec4(vec3(pixelDiffuseColor) +add, 1.0);
  }else{
    gl_FragColor = vec4(0.0, 0.0 , 0.0, 0.0);
  }
}
