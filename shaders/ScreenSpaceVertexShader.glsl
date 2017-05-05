precision highp float;
attribute vec2 sspoint;
uniform float logDepthBufC;
#define EPSILON 1e-6

uniform vec3 planetPosition;
uniform vec3 nearestPoint;
uniform mat4 projectionInverse;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 viewInverseMatrix;
uniform float ttime;

varying vec3 cameraRay;

void main(){
  vec4 pos = vec4(sspoint, 0.0, 1.0);
  vec3 dir = vec3(sspoint, 1.0);
  vec4 projectPos = vec4((projectionInverse* vec4(dir, 1.0)).xyz, 0.0);
  cameraRay = (viewInverseMatrix * projectPos).xyz;

  gl_Position = pos;
}
