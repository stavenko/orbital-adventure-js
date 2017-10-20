uniform sampler2D heightMap;
uniform float radius;
uniform float textureHorizont;
uniform vec3 planetPosition;
uniform vec4 rotation;
uniform int lod;
uniform vec2 textureCenter;
uniform mat4 myViewMatrix;
uniform mat4 myProjectionMatrix;
uniform int face;

uniform vec3 basisS;
uniform vec3 basisT;
uniform float logDepthBufC;
#define EPSILON 1e-6
#include <calculateNormal>
#include <quaternion>

void main() {

  vec2 parametricCoords = position.xy * 2.0;
  vec3 gridPointNormal = normalize(stToNormal(textureCenter, face));
  vec3 sphereSurfacePoint = gridPointNormal * radius;

  vec3 spherePlaneShift = textureHorizont * (basisS * parametricCoords.x +
    basisT * parametricCoords.y);
  vec3 sphereShiftedPoint = sphereSurfacePoint + spherePlaneShift;


  /*
  vec3 planetRelatedPlanePosition = rotate(sphereSurfacePoint +
     spherePlaneShift * textureHorizont, rotation);

  vec3 rotatedSurfacePoint = rotate(sphereSurfacePoint, rotation);
*/
  float spherePlaneDistance = length(parametricCoords) * textureHorizont;
  vec3 rotationAxis = normalize(cross(sphereSurfacePoint, sphereShiftedPoint));

  float planeArcAngle = spherePlaneDistance / radius;
  vec4 rotationalQuat = fromAxisAngle(rotationAxis, planeArcAngle);
  vec3 planetRelatedPosition = rotate(gridPointNormal, rotationalQuat);
  planetRelatedPosition = rotate(planetRelatedPosition, rotation);
  planetRelatedPosition *= radius;
  planetRelatedPosition += planetPosition;
  mat4 pv1 = myProjectionMatrix * myViewMatrix;

  // gl_Position = vec4(planetRelatedPosition, 1.0);
  gl_Position =  pv1 * vec4(planetRelatedPosition, 1.0);
  float z = log2(max(EPSILON, gl_Position.w + 1.0 )) * logDepthBufC;
  gl_Position.z = (z - 1.0) * gl_Position.w;
}
