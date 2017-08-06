uniform float fovPerPixel;
uniform float pixelFovRatio;
uniform float radius;
uniform float size;
uniform float horizonDistance;
uniform float maxDistance;
uniform float heightBasedLOD;
uniform vec3 planetCenter;
uniform vec3 cameraDirection;
uniform vec4 planetRotation;
varying vec3 sphereNormal;
varying vec3 sphereLookupNormal;
varying float surfaceDistanceToClosestPoint;
// varying float heightBasedLOD;
#define TEXTURE_SIZE 512.0
#define PI 3.141592653589793
#define MAX_LOD 20

const float borderLineWidth = 1.0/512.0;
const float distanceZones = 4.0;
const float veryFar = 1.0 / 3.0;
const float tooFar = 2.0 / 3.0;
const float tan60 = 1.7320508075688774;
const float tan30 = 0.5773502691896257;
#include <calculateNormal>
#include <quaternion>


float pixelSizeAtLod(int lod){
  float division = pow(2.0, float(lod));
  float planetEquator = radius * 2.0 * PI;
  return planetEquator / 4.0 / division / TEXTURE_SIZE;

}

vec4 packTile(int tileNumber, int face, int lod){
  //if (lod == 0) {
  //  return vec4(0.0, 0.0, 0.0, 0.0);
  //}
    
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
  vec2 uv = st2uv(getSt(normal, face));
  float division = pow(2.0, float(lod));

  float J = floor(uv.x * division);
  float I = floor(uv.y * division);

  float S = J * (1.0 / division);
  float T = I * (1.0 / division);

  vec2 newUV  = vec2(S + (0.5 / division), T + (0.5 / division));
  
  return normalize(stToNormal(newUV, face));
}

vec3 gc(int i ){
  if(i == 0) return vec3(0.1, 0.1, 0.1);
  if(i == 1) return vec3(0.8, 0.0, 0.0);
  if(i == 2) return vec3(0.6, 0.0, 0.0);
  if(i == 3) return vec3(0.4, 0.0, 0.0);
  if(i == 4) return vec3(0.6, 0.6, 0.6);

  if(i == 5) return vec3(0.0, 1.0, 0.0);
  if(i == 6) return vec3(0.0, 0.8, 0.0);
  if(i == 7) return vec3(0.0, 0.6, 0.0);
  if(i == 8) return vec3(0.0, 0.4, 0.0);
  if(i == 9) return vec3(1.0, 0.0, 0.0);
  if(i == 10)return vec3(0.0, 0.0, 1.0);
  if(i == 11)return vec3(0.0, 0.0, 0.8);
  if(i == 12) return vec3(0.0, 0.0, 0.6);
  return vec3(0.0, 1.0, 1.0);

}


float getSurfaceDistance() {
  return surfaceDistanceToClosestPoint / horizonDistance;
}

/*
int getLodAtDistance(vec3 cameraDir, vec3 lookupNormal) {
  float correctLOD;
  
  // take normal to closest point
  // find angle and multiply it on radius
  // this should be something between 0 and `size`;
  // float distanceToClosestPointAtSurface = length(planetCenter) - radius;
  float surfaceDistance = getSurfaceDistance(cameraDir, lookupNormal);
  float normalizedHeight = cameraSurfaceHeight / horizonDistance;
  // float normalizedDistance = getNormalizedDistance();
  float lod = heightBasedLOD; // 12.0 - max(0.0, log2(normalizedDistance * 4096.0));
  float centralLod = floor(lod);

  float firstStep =  ctan30 * cameraSurfaceHeight;
  float secondStep =  ctan30 * cameraSurfaceHeight;

  if(surfaceDistance < firstStep)
    correctLOD = heightBasedLOD);
  if(surfaceDistance < secondStep && surfaceDistance > firstStep)
    correctLOD = heightBasedLOD - 1.0;
  if(surfaceDistance > secondStep) 
    correctLOD = 0.0;
  
  return int(clamp(correctLOD, 0.0, 12.0));

  // float distanceOfLod = lod - centralLod;
  // if(surfaceDistance > distanceOfLod) 
  //  return int(centralLod);
  // return int(min(12.0, centralLod + 1.0));
}

*/

int min(int v, int M){
  return v < M ? v : M;
}

int max(int v, int M){
  return v > M ? v : M;
}
int clamp(int v, int m, int M){
  return max(m, min(v, M));
}

int getLodPixelSizeBased(vec3 lookupNormal, vec3 cameraDir){
  vec4 backwardsRotation = inverseQuat(planetRotation);
  vec3 normal = rotate(lookupNormal, backwardsRotation);

  float distanceToPoint = length(normal * radius + planetCenter);
  float pixelSizeAtDistance = distanceToPoint * tan(fovPerPixel / 2.0) * 2.0;
  float pixelSizeAtLODZero = 2.0 * radius * PI / 4.0 / 512.0;
  float pixelSizeAtLOD = pixelSizeAtLODZero;
  float lookupDot = abs(dot(cameraDir, lookupNormal));
  float surfaceDistance = getSurfaceDistance();
  int lodReducer = 0;

  if(surfaceDistance > veryFar){
    lodReducer = 1;
  
  } else if( surfaceDistance > tooFar){
  
    lodReducer = 2;
  }

  // return int(floor(lookupDot * 12.0));

  int LOD = 0;
  bool isOk = false;
  for(int i = 0; i <= MAX_LOD; ++i){
    if(!isOk && pixelSizeAtDistance > (0.5 * pixelSizeAtLOD) ){
      LOD = i - lodReducer;
      isOk = true;
    }else{
      pixelSizeAtLOD /= 2.0;
    }
  }
  /*
  if(!isOk) {
    float d = (pixelSizeAtLOD - pixelSizeAtDistance);
    float D = (pixelSizeAtLODZero - pixelSizeAtDistance);
    if(D < d) return 0;
    if(d < D) return MAX_LOD;
  }*/
  return LOD;
}

/*
int determineLod(vec3 lookupNormal, out float _distance, out vec3 _normal){
  vec4 backwardsRotation = inverseQuat(planetRotation);
  float facePixelCoefficient = 0.25; //   cos((PI/4.0) * abs(st.x)) * cos((PI/4.0) * abs(st.y));
  bool correctLodIsFound = false;
  int correctLod = 0;
  int maxLod = 0;
  // _distance = length(rotate(lookupNormal, backwardsRotation) * radius +
      // planetCenter)*tan(pixelFov/2.0) * 2.0;
  for(int i = 12; i >= MAX_LOD; --i) {
    float distanceAtLod = exp(1.0 / (-float(12-i)/12.0))*2.718281828459045;
    float texturePixelSize = pixelSizeAtLod(i);
    vec3 centralNormal = findMyCentralNormal(lookupNormal, i);
    vec3 normal = rotate(centralNormal, backwardsRotation);
    vec3 planetSurface = normal * radius + planetCenter;
    float distanceToSurface = length(planetSurface);
  
    int lodOnDistance = int(floor(log2(distanceToSurface / maxDistance) *
          4096.0));

    if(maxLod < lodOnDistance) maxLod = lodOnDistance;
    // maxLod = max(maxLod, lodOnDistance);
    // if(minLod > lodOnDistance) minLod = lodOnDistance;
    // float shouldHavePixelSize =  distanceToSurface * tan(pixelFov/2.0) * 2.0;

   
   // if(!correctLodIsFound && lll <= distanceAtLod){
   //   correctLod = i;
   //   correctLodIsFound = true;
   //   _normal = normal;
   //   // _distance = shouldHavePixelSize / 1.0e4;
   // }
  } 
  // _distance = (1.0 / 12.0)* maxDistance;
  return maxLod;
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
}
*/


void main(){
  int face = determineFace(sphereLookupNormal);
  vec2 st = getSt(sphereLookupNormal, face);

  
  float d = 0.0;
  vec3 vvv;
  // int correctLod = determineLod(sphereLookupNormal, d, vvv);
  //int correctLod = getLodAtDistance(cameraDirection, sphereLookupNormal);
  int correctLod = clamp(getLodPixelSizeBased(sphereLookupNormal,
        cameraDirection), 0, 12);

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
  /*
*/
  gl_FragColor = packTile(tileNumber, face, correctLod); 

  // gl_FragColor = vec4(clr, 1.0);
  // gl_FragColor.rgb = vec3(getSurfaceDistance());
  // gl_FragColor.rgb = abs(sphereLookupNormal);
  
  // gl_FragColor.y = d;
  // gl_FragColor.x = d;
  // gl_FragColor.rgb = vvv;
}
