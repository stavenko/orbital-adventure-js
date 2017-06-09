precision highp float;

#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>
uniform sampler2D transmittanceTexture;
uniform sampler2D singleMieScatteringTexture;
uniform sampler2D deltaMultipleScatteringTexture3;
uniform sampler2D deltaIrradianceTexture3;
const int scattering_order = 4;

void main() {
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);
  vec3 scattering_density = ComputeScatteringDensityTexture(
      atm, transmittanceTexture, deltaMultipleScatteringTexture3,
      singleMieScatteringTexture, deltaMultipleScatteringTexture3,
      deltaIrradianceTexture3, gl_FragCoord.xy,
      scattering_order);
  gl_FragColor = vec4(scattering_density, 1.0);

}

