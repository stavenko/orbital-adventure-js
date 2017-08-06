uniform vec3 center;
uniform vec3 planetCenter;
uniform vec3 north;
uniform vec3 east;
uniform vec4 planetRotation;
uniform float size;
uniform float radius;
uniform float horizonDistance;
uniform float maxDistance;
uniform int face;
uniform int tile;
uniform int lod;

uniform mat4 myViewMatrix;
uniform mat4 myProjectionMatrix;

uniform float logDepthBufC;
varying vec3 sphereLookupNormal;
varying vec3 sphereNormal;
varying float surfaceDistanceToClosestPoint;
//varying float heightBasedLOD;

vec3 defaultNorth = vec3(0.0, 1.0, 0.0);

#define EPSILON 1e-6
#define HEIGHT_TEXTURE_SIZE 256.0
#include <quaternion>

float angleBetween(vec3 nv, vec3 nu){
  return acos(dot(nv, nu));
}

float getNormalizedDistance() {
  float distanceToClosestPointAtSurface = length(planetCenter) - radius;
  float normalizedDistance = distanceToClosestPointAtSurface / maxDistance;

  return clamp(normalizedDistance, 1e-6, 1.0);
}

void main(){
  vec2 xy = position.xy;
  vec3 northAligned = north * xy.y + east * xy.x;
  vec3 inGridPosition = vec3(northAligned*size);
  float northAngle = angleBetween(defaultNorth, north);
  vec3 northAxis = normalize(cross(defaultNorth, north));
  vec3 gridPosition =  inGridPosition + center;
  float lengthToPosition = length(inGridPosition);
  surfaceDistanceToClosestPoint = lengthToPosition;
  // heightBasedLOD = 12.0 - max(0.0, log2(getNormalizedDistance() * 4096.0));

  vec3 v = center - planetCenter;
  vec3 v0 = gridPosition - planetCenter;
  float angle = lengthToPosition / radius;
  vec3 finalPosition;
  vec3 lookupNormal;
  if(angle > 1e-4){
    vec3 axis = normalize(cross(v, v0));
    vec4 quat = fromAxisAngle(axis, angle);
    finalPosition = rotate(v, quat);
  }else{
    finalPosition = v;
  }

  sphereLookupNormal = vec3( vec4(rotate(normalize(finalPosition), planetRotation), 0.0));
  sphereNormal = vec3( vec4(normalize(finalPosition), 0.0));

  mat4 pv1 = myProjectionMatrix * myViewMatrix;

  gl_Position =  pv1 * vec4(finalPosition + planetCenter, 1.0);
  float z = log2(max(EPSILON, gl_Position.w + 1.0 )) * logDepthBufC;
  gl_Position.z = (z - 1.0) * gl_Position.w;
}

