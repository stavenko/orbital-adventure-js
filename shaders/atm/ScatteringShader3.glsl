precision highp float;
uniform sampler2D deltaMultipleScatteringTexture3;
uniform sampler2D scatteringTexture2;

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
      8 *  SCATTERING_TEXTURE_MU_SIZE
  );

  vec2 uv = gl_FragCoord.xy / res;
  vec4 dmst = texture2D(deltaMultipleScatteringTexture3, uv);
  vec4 s = texture2D(scatteringTexture2, uv);

  dmst = vec4( dmst.rgb / RayleighPhaseFunction(dmst.a), 0.0);

  gl_FragColor = s + dmst;
  // gl_FragColor = vec4(uv.xy, 0.0, 0.0);
}


