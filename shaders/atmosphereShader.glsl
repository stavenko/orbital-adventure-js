precision highp float;
#define TRANSMITTENCE_NON_LINEAR
uniform vec2 resolution;
uniform vec3 planetPosition; // planetPosition relative to camera;
uniform vec3 sunDirection;
uniform float ttimeVar;
uniform float radius;
uniform float atmosphereHeight;

uniform sampler2D transmittanceTexture;
uniform sampler2D deltaIrradianceTexture;
//uniform sampler2D deltaETexture;
//uniform sampler2D irradianceTexture;
//uniform sampler2D deltaJTexture;
//uniform sampler2D deltaSMTexture;
//uniform sampler2D deltaSRTexture;
//uniform sampler2D inscatterTexture;
uniform vec4 atmosphereTableResolution;
uniform vec2 resolutionOf4d;
//uniform vec4 deltaSRTexture4dResolution;
//uniform vec2 deltaSRTextureResolution;

//uniform sampler2D deltaSMTexture;
//uniform vec4 deltaSMTexture4dResolution;
//uniform vec2 deltaSMTextureResolution;

varying vec3 cameraRay;

vec2 toIJ(float ix, vec2 resolution){
  float j = floor(ix / resolution.x);
  float i = ix - j*resolution.x;
  return vec2(i,j);
}


vec4 texture3d(sampler2D sampler, vec3 resolution, vec2 resolution2, vec3 uvw){
  vec3 indexes = floor(uvw * resolution);
  float IX = (indexes.x * resolution.y + indexes.y)* resolution.z + indexes.z;
  vec2 ij = toIJ(IX, resolution2);
  vec2 uv = ij / resolution2;
  return texture2D(sampler, uv);
}

vec4 texture4D(sampler2D sampler, vec4 uvwo){
  vec4 resolution = atmosphereTableResolution;
  vec2 resolution2 = resolutionOf4d;
  vec4 indexes = floor(uvwo * resolution);
  float size = resolution.x * resolution.y * resolution.z * resolution.w;
  float X = indexes[0] * resolution[1] + indexes[1];
  float XX = X * resolution[2] + indexes[2];
  float IX = XX * resolution[3] + indexes[3];
  // vec2 uv = vec2(IX / size, 0.0);
  vec2 ij = toIJ(IX, resolution2);
  vec2 uv = ij / resolution2;
  return texture2D(sampler, uv);
}


vec2 getTransmittanceUV(float r, float mu){
  float uR, uMu;
  float Rg = radius/1000.0;
  float Rt = Rg + atmosphereHeight;
#ifdef TRANSMITTANCE_NON_LINEAR
  uR = sqrt((r - Rg) / (Rt - Rg));
  uMu = atan((mu + 0.15) / (1.0 + 0.15) * tan(1.5)) / 1.5;
#else
  uR = (r - Rg) / (Rt - Rg);
  uMu = (mu + 0.15) / (1.0 + 0.15);
#endif
  return vec2(uMu, max(uR,1.0));
}

vec3 inscatter(vec3 x, float t, vec3 v, vec3 s, float r, float mu, out vec3
    attenuation){
  return vec3(0.2, 0.0, 0.0);
}

vec3 groundColor(vec3 x, float t, vec3 v, vec3 s, float r, float mu, out vec3
    attenuation){
  return vec3(0.1);
}

vec3 sunColor(vec3 x, float t, vec3 v, vec3 s, float r, float mu, out vec3
    attenuation){
  return vec3(0.1);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;

  float r = length(planetPosition);
  vec3 ray = normalize(cameraRay);
  float mu = dot(planetPosition, ray) / r;
  float Rg = radius;

  float t = -r * mu - sqrt(r * r * (mu * mu - 1.0) + Rg * Rg);

  vec2 uvRMu = getTransmittanceUV(r/1000.0, mu);

  //vec4 transmittanceTexel = texture2D(deltaIrradianceTexture, uv);
  vec4 transmittanceTexel = texture2D(transmittanceTexture, uv);
  //vec4 transmittanceTexel = texture4D(
      //inscatterTexture,
      //vec4(uv, cos(ttimeVar*10.0), cos(ttimeVar))
      //);

  vec3 col = cameraRay;
  vec3 attenuation;
  //vec3 pixelColor = inscatter(x, t, s, r, mu, attenuation)
    //+ groundColor(x, t, s, r, mu, attenuation)
    //+ sunColor(x, t, s, r, mu);
  vec3 pixelColor = vec3(0.0);
  pixelColor = abs(transmittanceTexel.rgb);

  gl_FragColor = vec4(pixelColor, 1.0);
}
