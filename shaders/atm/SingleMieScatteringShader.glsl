precision highp float;
#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>
uniform sampler2D transmittanceTexture;
void main() {
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);
  vec2 layerResolution = vec2(atmosphereTableResolution[0] *
      atmosphereTableResolution[1], atmosphereTableResolution[2]);

  vec3 uvw = map2d3d(gl_FragCoord.xy, layerResolution);
  vec3 delta_rayleigh, delta_mie;
  ComputeSingleScatteringTexture(
      atm, transmittanceTexture, uvw,
      delta_rayleigh, delta_mie);

  gl_FragColor = vec4(delta_mie, 1.0);
}

