uniform sampler2D colorMap;
uniform sampler2D specularMap;
uniform sampler2D normalMap;
uniform sampler2D heightMap;

uniform float lod;
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
#define TEXTURE_SIZE 512.0
#define HEIGHT_TEXTURE_SIZE 256.0
#define PI 3.141592653589793


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
  
  if(f == 2) return vec2(-n.z/ abs(n.x), -n.y/abs(n.x)); // +x
  if(f == 0) return vec2(n.z/ abs(n.x), -n.y/abs(n.x)); 

  if(f == 4) return vec2(n.x/ abs(n.z), -n.y/abs(n.z)); // +z
  if(f == 5) return vec2(-n.x/ abs(n.z), -n.y/abs(n.z)); 

  if(f == 3) return vec2(n.x/ abs(n.y), n.z/abs(n.y)); // +y
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
  if(t == 1) return texel.y;
  if(t == 2) return texel.z;
  if(t == 3) return texel.w;
}

float heightMapLookup(sampler2D map, vec2 uv){
  vec2 nuv = getHeightUV(uv);
  vec4 texel = texture2D(heightMap, nuv);
  return texelLookup(texel,uv);
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

  vec3 v01 = normalize(sphereNormal * radius + north * pixelSize) +
    (h21-h01) * planetMaxHeight;


  vec3 va = normalize(vec3(size.xy, h21-h01));
  vec3 vb = normalize(vec3(size.yx, h12-h10));
  return cross(va,vb);
  
}


void main(){
  int face = int(fface);
  int nFace = determineFace(sphereNormal);

  if(nFace == face){
    if(shownFaces == 0){
      gl_FragColor = vec4(0.0);
      return;
    }

    vec2 st = (getSt(sphereNormal, face) + vec2(1.0,1.0)) / vec2(2.0,2.0);
    if(!isWithinUV(st)){
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.00);
      return;
    }

    
    vec2 uv = mod(st, vec2(1.0/division)) / vec2(1.0/division);

    float height = heightMapLookup(heightMap, uv.yx);
    //vec3 sphn = -1.0 * sphereNormal;
    //int ff = determineFace(sphn);
    //vec2 uvuv = 0.5 * (getSt(sphn, ff) + 1.0);
    vec3 textureNormal = texture2D(normalMap, uv.xy).xyz*2.0 - 1.0;

    float light = clamp(dot(textureNormal, lightDirection), 0.0, 1.0);
    float nnn = dot(sphereNormal, lightDirection);
    float pixelDiffuseColor = 0.5*(height + 1.0);
    if(textureTypeAsColor!= 0)
      pixelDiffuseColor = light;
    

    gl_FragColor = vec4(vec3(pixelDiffuseColor) , 1.0);
  }else{
    gl_FragColor = vec4(0.0, 0.0 , 0.0, 0.0);
  }
}
