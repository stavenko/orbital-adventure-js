precision highp float;

const int scattering_order = 2;

uniform sampler2D deltaMultipleScatteringTexture1;
uniform sampler2D singleMieScatteringTexture;

#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>

void main() {
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);
  vec3 delta_irradiance = ComputeIndirectIrradianceTexture(
      atm, deltaMultipleScatteringTexture1,
      singleMieScatteringTexture, deltaMultipleScatteringTexture1,
      gl_FragCoord.xy, scattering_order - 1);

  gl_FragColor = vec4(delta_irradiance, 1.0);
}


