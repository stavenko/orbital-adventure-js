precision highp float;
#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>

uniform sampler2D transmittanceTexture;
uniform sampler2D singleMieScatteringTexture;
uniform sampler2D deltaMultipleScatteringTexture1;
uniform sampler2D deltaIrradianceTexture1;
const int scattering_order = 2;

void main() {
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);

  vec2 layerResolution = vec2(atmosphereTableResolution[0] *
      atmosphereTableResolution[1], atmosphereTableResolution[2]);

  vec3 uvw = map2d3d(gl_FragCoord.xy, layerResolution);

  vec2 res = vec2(
      SCATTERING_TEXTURE_NU_SIZE * SCATTERING_TEXTURE_MU_S_SIZE,
      SCATTERING_TEXTURE_R_SIZE * SCATTERING_TEXTURE_MU_SIZE
  );
  vec3 scattering_density = ComputeScatteringDensityTexture(
      atm, transmittanceTexture, deltaMultipleScatteringTexture1,
      singleMieScatteringTexture, deltaMultipleScatteringTexture1,
      deltaIrradianceTexture1, uvw, scattering_order);
  
  //gl_FragColor = vec4(uvw/vec3(layerResolution, 32.0), 1.0);
  gl_FragColor = vec4(scattering_density, 1.0);

}

