precision highp float;
uniform sampler2D deltaMultipleScatteringTexture2;
uniform sampler2D scatteringTexture1;

#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>

void main() {
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);
  vec2 res = vec2(
      4 * SCATTERING_TEXTURE_NU_SIZE * SCATTERING_TEXTURE_MU_S_SIZE,
      8 * SCATTERING_TEXTURE_MU_SIZE
  );

  vec2 uv = gl_FragCoord.xy / res;
  vec4 dmst = texture2D(deltaMultipleScatteringTexture2, uv);
  vec4 s = texture2D(scatteringTexture1, uv);

  vec4 dm = vec4( dmst.rgb / RayleighPhaseFunction(dmst.a), 0.0);

  gl_FragColor = s+dm; 
}


