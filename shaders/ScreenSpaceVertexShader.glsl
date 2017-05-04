precision highp float;
attribute vec2 sspoint;
uniform float logDepthBufC;
#define EPSILON 1e-6

uniform vec3 planetPosition;
uniform vec3 nearestPoint;
uniform mat4 viewInverse;
uniform mat4 projectionInverse;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform float ttime;

varying vec3 cameraRay;

void main(){
  mat4 pv1 = projectionMatrix * viewInverse;
  vec4 pos = vec4(sspoint, 0.0, 1.0);
  vec4 projectPos = vec4((projectionInverse * pos).xyz, 0.0);
  cameraRay = (viewInverse * projectPos).xyz;

  gl_Position = pos;
}
