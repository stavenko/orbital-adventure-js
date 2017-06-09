precision highp float;
uniform sampler2D deltaMultipleScatteringTexture;
uniform sampler2D scatteringTexture3;

#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>

void main() {
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);
  vec2 res = vec2(
      SCATTERING_TEXTURE_NU_SIZE * SCATTERING_TEXTURE_MU_S_SIZE,
      SCATTERING_TEXTURE_R_SIZE * SCATTERING_TEXTURE_MU_SIZE
  );

  vec2 uv = gl_FragCoord.xy / res;
  vec4 dmst = texture2D(deltaMultipleScatteringTexture, uv);
  vec4 s = texture2D(scatteringTexture3, uv);

  dmst = vec4( dmst.rgb / RayleighPhaseFunction(dmst.a), 1.0);


  gl_FragColor = s + dmst;
}


