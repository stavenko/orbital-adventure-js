precision highp float;

uniform sampler2D deltaIrradianceTexture2;
#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>



void main(){
  AtmosphereParameters atm;
  atmosphereObjectConstructor(atm);
  setupTextureDimensions(atmosphereTableResolution);
  vec2 res = IRRADIANCE_TEXTURE_SIZE;
  vec2 uv = gl_FragCoord.xy / res;
  vec4 di = texture2D(deltaIrradianceTexture2, uv);
  gl_FragColor = vec4(di.rgb, 1.0);

}
