import {getTransmittenceColor} from './transmittance.js';

export function prepareTexture2With(width, height, components, fn, Type = Float32Array){
  let texture = new Float32Array(width * height *components);
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
  return texture;
}
export function generateAtmosphere(textureProperties, planetProperties){
  //   128    8      32      32
  let {resMu, resNu, resMus, resR} = textureProperties;
  let combinedProps = {...planetProperties, ...textureProperties};

  let transmittanceTexture = prepareTexture2With(resMu*2, resR*2, 1,(s,t)=>{
    return getTransmittenceColor(s,t, combinedProps);
  }

}
