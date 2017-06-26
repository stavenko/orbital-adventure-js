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

  vec2 layerResolution = vec2(atmosphereTableResolution[0] *
      atmosphereTableResolution[1], atmosphereTableResolution[2]);

  vec3 uvw = map2d3d(gl_FragCoord.xy, layerResolution);

  float nu;
  vec3 delta_multiple_scattering = ComputeMultipleScatteringTexture(
      atm, transmittanceTexture, scatteringDensityTexture3,
      uvw, nu);
  gl_FragColor = vec4(delta_multiple_scattering, nu);
}

