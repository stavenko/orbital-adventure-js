precision highp float;

uniform sampler2D deltaIrradianceTexture4;
uniform sampler2D irradianceTexture3;
#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>

void main(){
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);
  vec2 uv = gl_FragCoord.xy / IRRADIANCE_TEXTURE_SIZE;
  vec4 di = texture2D(deltaIrradianceTexture4, uv);
  vec4 i = texture2D(irradianceTexture3, uv);
  gl_FragColor = vec4(di.rgb + i.rgb, 1.0);
}
