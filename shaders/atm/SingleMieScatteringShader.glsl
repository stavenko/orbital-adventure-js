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

  vec3 delta_rayleigh, delta_mie;
  ComputeSingleScatteringTexture(
      atm, transmittanceTexture, gl_FragCoord.xy,
      delta_rayleigh, delta_mie);

  gl_FragColor = vec4(delta_mie, 1.0);
}

