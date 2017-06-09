precision highp float;
uniform sampler2D transmittanceTexture;

#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>


void main() {
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);

  vec3 delta_mie, delta_rayleigh;
  ComputeSingleScatteringTexture(
      atm, transmittanceTexture, gl_FragCoord.xy,
      delta_rayleigh, delta_mie);
  gl_FragColor = vec4(delta_rayleigh, 1.0);
}
