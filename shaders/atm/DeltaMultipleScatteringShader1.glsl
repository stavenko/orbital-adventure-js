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

  
  vec2 layerResolution = vec2(atmosphereTableResolution[0] *
      atmosphereTableResolution[1], atmosphereTableResolution[2]);

  vec3 uvw = map2d3d(gl_FragCoord.xy, layerResolution);

  // vec2 inCellCoords = mod(gl_FragCoord.xy, layerResolution);
  // float cellX = floor(gl_FragCoord.x / layerResolution.x);
  // float cellY = floor(gl_FragCoord.y / layerResolution.y);
  // float layer = cellY * 4.0 + cellX;


  ComputeSingleScatteringTexture(
      atm, transmittanceTexture, uvw,
      delta_rayleigh, delta_mie);
  gl_FragColor = vec4(delta_rayleigh, 1.0);
}
