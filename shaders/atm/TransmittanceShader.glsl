precision highp float;
#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>

void main() {
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);
  vec3 transmittance = ComputeTransmittanceToTopAtmosphereBoundaryTexture(
      atm, gl_FragCoord.xy);
   gl_FragColor = vec4(transmittance, 1.0);
}

