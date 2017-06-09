precision highp float;
uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringDensityTexture3;

#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>

void main() {
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);

  float nu;
  vec3 delta_multiple_scattering = ComputeMultipleScatteringTexture(
      atm, transmittanceTexture, scatteringDensityTexture3,
      gl_FragCoord.xy, nu);
  gl_FragColor = vec4(delta_multiple_scattering, nu);
}

