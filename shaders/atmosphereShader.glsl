precision highp float;
uniform vec2 resolution;
uniform vec3 planetPosition; // planetPosition relative to camera;
uniform float ttimeVar;
uniform float radius;
uniform float atmosphereHeight;

uniform sampler2D transmittanceTexture;



varying vec3 cameraRay;
void main(){
  vec2 uv = gl_FragCoord.xy / resolution;

  float r = length(planetPosition);
  vec3 ray = normalize(cameraRay);
  float mu = dot(-planetPosition, ray) / r;
  float Rg = radius;

  float t = -r * mu - sqrt(r * r * (mu * mu - 1.0) + Rg * Rg);


  vec4 transmittanceTexel = texture2D(transmittanceTexture, vec2(r,mu));
  vec3 col = cameraRay;
  gl_FragColor = vec4(transmittanceTexel.rgb, 0.5);
  //gl_FragColor = vec4((ray), 0.8);
}
