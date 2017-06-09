vec2 getTransmittanceResolution(vec4 atmosphereTableResolution){
  float resMu = atmosphereTableResolution[2];
  float resR = atmosphereTableResolution[3];
  return vec2(resMu*2.0, resR*2.0);
}

vec2 getIrradianceResolution(vec4 atmosphereTableResolution){
  float resMus = atmosphereTableResolution[0], 
        resR = atmosphereTableResolution[3];
  return vec2(resMus*2.0, resR/2.0);
}

void setupTextureDimensions(vec4 atmosphereTableResolution){
  SCATTERING_TEXTURE_R_SIZE = int(atmosphereTableResolution[3]);
  SCATTERING_TEXTURE_NU_SIZE = int(atmosphereTableResolution[1]);
  SCATTERING_TEXTURE_MU_SIZE = int(atmosphereTableResolution[2]);
  SCATTERING_TEXTURE_MU_S_SIZE = int(atmosphereTableResolution[0]);
  vec2 tRes  = getTransmittanceResolution(atmosphereTableResolution);
  vec2 iRes  = getIrradianceResolution(atmosphereTableResolution);
  TRANSMITTANCE_TEXTURE_WIDTH = int(tRes.x); 
  TRANSMITTANCE_TEXTURE_HEIGHT = int(tRes.y);
  IRRADIANCE_TEXTURE_WIDTH = int(iRes.x); 
  IRRADIANCE_TEXTURE_HEIGHT = int(iRes.y);
  IRRADIANCE_TEXTURE_SIZE = iRes;
}
