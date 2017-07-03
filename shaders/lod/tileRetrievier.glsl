uniform float pixelFov;
uniform float radius;
uniform vec3 planetCenter;
uniform vec3 cameraDirection;
uniform vec4 planetRotation;
varying vec3 sphereNormal;
varying vec3 sphereLookupNormal;
#define TEXTURE_SIZE 512.0
#define PI 3.141592653589793
#define MAX_LOD 12
const float borderLineWidth = 0.01;
#include <lodUtils>
#include <calculateNormal>
#include <quaternion>

const float maxDistance = 10e6;

float pixelSizeAtLod(int lod){
  float division = pow(2.0, float(lod));
  float planetEquator = radius * 2.0 * PI;
  return planetEquator / 4.0 / division / TEXTURE_SIZE;

}

vec4 packTile(int tileNumber, int face, int lod){
  float tn = float(tileNumber);
  float firstByte = mod(tn, 256.0);
  float twoBytes = floor(tn / 256.0);
  float secondByte = mod(twoBytes, 256.0);
  float thirdByte = floor(twoBytes / 256.0);
  float faceLod = 255.0 - float(lod * 6 + face);;
  
  return vec4(thirdByte/255., secondByte/255., firstByte/255., faceLod/255.);
}


vec3 findMyCentralNormal(vec3 normal, int lod){
  int face = determineFace(normal);
  vec2 st = st2uv(getSt(normal, face));
  float division = pow(2.0, float(lod));

  float J = floor(st.x * division);
  float I = floor(st.y * division);

  float S = J * (1.0 / division);
  float T = I * (1.0 / division);

  vec2 newSt  = vec2(S + (0.5 / division), T + (0.5 / division));
  
  return normalize(stToNormal(newSt, face));
}

vec3 gc(int i ){
  if(i == 0) return vec3(1.0, 0.0, 0.0);
  if(i == 1) return vec3(0.8, 0.0, 0.0);
  if(i == 2) return vec3(0.6, 0.0, 0.0);
  if(i == 3) return vec3(0.4, 0.0, 0.0);
  if(i == 4) return vec3(0.2, 0.0, 0.0);
  if(i == 5) return vec3(0.0, 0.2, 0.0);
  if(i == 6) return vec3(0.0, 0.4, 0.0);
  if(i == 7) return vec3(0.0, 0.6, 0.0);
  if(i == 8) return vec3(0.0, 0.8, 0.0);
  if(i == 9) return vec3(0.0, 1.0, 0.0);
  if(i == 10)return vec3(0.0, 0.8, 0.2);
  if(i == 11)return vec3(0.0, 0.6, 0.4);
  if(i == 12)return vec3(0.0, 0.4, 0.6);
  return vec3(0.0);

}


int determineLod(vec3 lookupNormal, out float _distance){
  vec4 backwardsRotation = inverseQuat(planetRotation);
  // int face = determineFace(lookupNormal);
  // vec2 st = getSt(lookupNormal, face);
  float facePixelCoefficient = 0.25;//   cos((PI/4.0) * abs(st.x)) * cos((PI/4.0) * abs(st.y));
  bool correctLodIsFound = false;
  int correctLod = -1;
  for(int i = 0; i <= MAX_LOD; ++i) {
    float distanceAtLod = pow(float(12 - i)/12.0, 5.0);
    float texturePixelSize = pixelSizeAtLod(i);
    vec3 centralNormal = findMyCentralNormal(lookupNormal, i);
    vec3 normal = rotate(centralNormal, backwardsRotation);
    vec3 planetSurface = normal * radius + planetCenter;
    float distanceToSurface = length(planetSurface) ;
  
    float lll = (distanceToSurface / maxDistance);

    float shouldHavePixelSize =  distanceToSurface * tan(pixelFov/2.0) * 2.0;

    if(!correctLodIsFound && (shouldHavePixelSize >= (texturePixelSize
            *facePixelCoefficient))){
      correctLod = i;
      correctLodIsFound = true;
      _distance = distanceToSurface;
    }
    /*
    if( !correctLodIsFound && (lll > distanceAtLod)) {
      correctLod = i;
      correctLodIsFound = true;
      _distance = distanceAtLod;
    }
    */
  } 
  _distance = (1.0 / 12.0)* maxDistance;
  if(!correctLodIsFound) correctLod = 0;
  return correctLod;
}

int findLodInNormal(vec3 lookupNormal){
  vec4 backwardsRotation = inverseQuat(planetRotation);
  vec3 normal = rotate(lookupNormal, backwardsRotation);
  vec3 surfacePosition = normal * radius + planetCenter;
  float distanceToSurface = length(surfacePosition) ;
  float shouldHavePixelSize =  distanceToSurface * tan(pixelFov/2.0) * 2.0;
  float facePixelCoefficient = 0.5;
  bool correctLodIsFound = false;
  int correctLod = -1;




  for(int i = MAX_LOD; i >= 0; i--){
    float texturePixelSize = pixelSizeAtLod(i);
    if(!correctLodIsFound && (shouldHavePixelSize <= (texturePixelSize
            *facePixelCoefficient))){
      correctLod = i;
      correctLodIsFound = true;
    }
  }
  return correctLod;
  /*

  int face = determineFace(surfaceNormal);
  vec2 st = getSt(surfaceNormal, face);
  float facePixelCoefficient = 0.5;//   cos((PI/4.0) * abs(st.x)) * cos((PI/4.0) * abs(st.y));
  bool correctLodIsFound = false;
  int correctLod = -1;
  float _distance = 0.0;
  for(int i = MAX_LOD; i >= 0; i--){
    float texturePixelSize = pixelSizeAtLod(i);
    // vec3 planetDirection = normalize(planetCenter);
    // float surfaceFactor = 0.5; //max(0.4, dot(centralNormal, planetDirection)); 
    // vec3 planetSurface = centralNormal * radius + planetCenter;
    vec3 planetSurfaceAtFrag = sphereNormal * radius  + planetCenter;
    float distanceToSurface = length(planetSurfaceAtFrag) ;
    float shouldHavePixelSize =  distanceToSurface * tan(pixelFov/2.0) * 2.0;
    if(!correctLodIsFound && (shouldHavePixelSize <= (texturePixelSize
            *facePixelCoefficient))){
      correctLod = i;
      correctLodIsFound = true;
      _distance = distanceToSurface;
    }
  } 
  if(!correctLodIsFound) correctLod = 0;
  return correctLod;

  */
}


void main(){
  int face = determineFace(sphereLookupNormal);
  vec2 st = getSt(sphereLookupNormal, face);

  
  // int correctLod = findLodInNormal(sphereLookupNormal);

  // correctLod = 0;
  // bool lodFound = false;
  float d = 0.0;
  int correctLod = determineLod(sphereLookupNormal, d);

  /*
  for(int L = 0; L < MAX_LOD; ++L){
    int lowerLods = 0;
    vec2 tile = findTile(st2uv(st), L);

    for( int i = 0; i <3; ++i){
      float fi =  float(i);
      float s = fi / 2.0; 
      for( int j = 0; j <3; ++j){
        float fj =  float(j);
        float t = fj / 2.0; 

        vec2 newSt = tileCoordsToFaceCoords(tile, vec2(s, t), L);
        vec3 normal = stToNormal(newSt, face);
        int lod = findLodInNormal(normal);
        if(lod > correctLod) ++lowerLods; 
      }
    }
    if(!lodFound){
      if(lowerLods < 8){
        lodFound = true;
        correctLod = L;
      }
    }
  }
  */



  // mcn = normalize(sphereLookupNormal);
  // face = determineFace(mcn);
  // st = getSt(mcn, face);
  float division = pow(2.0, float(correctLod));
  vec2 tileSt = mod(st2uv(st), 1.0/division)  * division;

  vec2 tile = findTile(st2uv(st), correctLod);
  int tileNumber = calculateTile(tile, correctLod);

  // vec3 clr = vec3(tileSt, 0.0);
  vec3 clr = gc(correctLod); //vec3(tileSt, 0.0);
  vec2 ddd = abs(tileSt - vec2(0.5));

  if(ddd.x < borderLineWidth/2.0 || ddd.x > 1.0 - borderLineWidth/2.0)
    clr += vec3(0.0, 0.0, 0.5);
  if(ddd.y < borderLineWidth/2.0 || ddd.y > 1.0 - borderLineWidth/2.0)
    clr += vec3(0.0, 0.0, 0.5);

  if(tileSt.x < borderLineWidth || tileSt.x > 1.0 - borderLineWidth)
    clr += vec3(0.0, 0.5, 0.0);
  if(tileSt.y < borderLineWidth || tileSt.y > 1.0 - borderLineWidth)
    clr += vec3(0.5, 0.0, 0.0);

  // vec3 centralNormalI = findMyCentralNormal(sphereNormal, 1);

  
  // gl_FragColor = vec4(clr, 1.0);
  //gl_FragColor.rgb = vec3(d);
  gl_FragColor = packTile(tileNumber, face, correctLod); 
  //vec4(vec3(float(tileNumber) / 16.0, 0.0, 1.0), 1.0);

}
