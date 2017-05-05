import * as THREE from 'three/src/constants.js';
import {getTransmittenceColor} from './transmittance.js';
import {DataTexture} from 'three/src/textures/DataTexture.js'

export function prepareTexture2With(width, height, components, fn, Type = Float32Array){
  let texture = new Type(width * height *components);
  for(let i = 0; i < width; ++i){
    for(let j = 0; j < height; ++j){
      let s = i/width;
      let t = j/height;
      let value = fn(s,t);
      let ix = components*(j*width +i);
      for(let c =0; c < components; ++c){
        texture[ix+c] = value[c];
      }
    }
  }

  let dt = new DataTexture(texture, width, height, THREE.RGBAFormat, THREE.FloatType);
  return dt;
}
export function generateAtmosphere(textureProperties, planetProperties){
  //   128    8      32      32
  let {resMu, resNu, resMus, resR} = textureProperties;
  let combinedProps = {...planetProperties, ...textureProperties};

  let transmittanceTexture = prepareTexture2With(resMu*2, resR*2, 4,(s,t)=>{
    return getTransmittenceColor(s,t, combinedProps, false);
  });

  return {
    transmittanceTexture
  }
}
