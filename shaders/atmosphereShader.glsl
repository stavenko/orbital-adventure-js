precision highp float;
uniform vec2 resolution;
uniform vec3 planetPosition; // planetPosition relative to camera;
uniform float ttime;

varying vec3 cameraRay;
void main(){
  vec2 uv = gl_FragCoord.xy / resolution;

  float r = length(planetPosition);
  float mu = dot(-planetPosition, cameraRay) / r;

  vec3 col = cameraRay;
  gl_FragColor = vec4(mu, mu, mu, 0.5);
}
