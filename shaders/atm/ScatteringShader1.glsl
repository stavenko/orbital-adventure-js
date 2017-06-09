precision highp float;
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
  vec2 res = vec2(
      SCATTERING_TEXTURE_NU_SIZE * SCATTERING_TEXTURE_MU_S_SIZE,
      SCATTERING_TEXTURE_R_SIZE * SCATTERING_TEXTURE_MU_SIZE
  );

  vec2 uv = gl_FragCoord.xy / res;
  vec4 dmst = texture2D(deltaMultipleScatteringTexture1, uv);
  vec4 mie = texture2D(singleMieScatteringTexture, uv);

  dmst.a = mie.r;

  gl_FragColor = dmst; 
}


