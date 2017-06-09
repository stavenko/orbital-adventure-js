precision highp float;

uniform sampler2D deltaMultipleScatteringTexture4;
uniform sampler2D singleMieScatteringTexture;
const int scattering_order = 4;

#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>
void main() {
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);

  vec3 delta_irradiance = ComputeIndirectIrradianceTexture(
      atm, deltaMultipleScatteringTexture4,
      singleMieScatteringTexture, deltaMultipleScatteringTexture4,
      gl_FragCoord.xy, scattering_order - 1);
  gl_FragColor = vec4(delta_irradiance, 1.0);
}


