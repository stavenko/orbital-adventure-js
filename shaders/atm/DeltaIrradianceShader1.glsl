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

  vec3 delta_irradiance = ComputeDirectIrradianceTexture(
      atm, transmittanceTexture, gl_FragCoord.xy);
  gl_FragColor = vec4(delta_irradiance, 1.0);
}


