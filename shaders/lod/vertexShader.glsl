
uniform sampler2D heightMap;
uniform vec3 planetCenter;
uniform vec4 planetRotation;
uniform float radius;
uniform int face;
uniform int tileCoordsJ;
uniform int tileCoordsI;
uniform int lod;

// uniform mat4 modelM;
uniform mat4 myViewMatrix;
uniform mat4 myProjectionMatrix;

uniform float logDepthBufC;
varying vec3 sphereLookupNormal;
varying vec3 sphereNormal;

vec3 defaultNorth = vec3(0.0, 1.0, 0.0);

#define EPSILON 1e-6
#define HEIGHT_TEXTURE_SIZE 256.0

#include <calculateNormal>
#include <quaternion>

float angleBetween(vec3 nv, vec3 nu){
  return acos(dot(nv, nu));
}


const float MAX_HEIGHT = 0.0; // 20.0e3;
void main(){
  vec2 xy = position.xy * 2.0;

  vec4 inverseRotation = inverseQuat(planetRotation);
  vec3 normal = normalize(stToNormal(xy, lod, tileCoordsJ, tileCoordsI, face));
  // sphereLookupNormal =  rotate(normal, inverseRotation);
  sphereLookupNormal =  rotate(normal, planetRotation);
  vec3 spherePosition = sphereLookupNormal * radius ;
  float height = heightMapLookup(heightMap, st2uv(xy));
  vec3 heightedPosition = spherePosition; //   + normal * height * MAX_HEIGHT;
  vec3 cameraRelatedPosition = heightedPosition  + planetCenter;
  mat4 pv1 = myProjectionMatrix * myViewMatrix;

  gl_Position =  pv1 * vec4(cameraRelatedPosition, 1.0);
  float z = log2(max(EPSILON, gl_Position.w + 1.0 )) * logDepthBufC;
  gl_Position.z = (z - 1.0) * gl_Position.w;

}
