import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';
import {Vector4} from 'three/src/math/Vector4';
import * as THREE from 'three/src/constants.js';
import {precalcs} from './utils.js';
import {getTransmittenceColor} from './transmittance.js';
import {getDeltaEColor, getDeltaEIterativeColor} from './deltaESampler.js';
import {getDeltaJPixel} from './deltaJ.js';
import {getDeltaSMieColor, getDeltaSRayColor, getDeltaSRCopier, getDeltaSRIterativeColor,  Stats} from './deltaSR.js';
import {DataTexture} from 'three/src/textures/DataTexture.js'

export function prepareTexture2With(width, height, components, fn, Type = Float32Array){
  let texture = new Type(width * height *components);
  for(let i = 0; i < width; ++i){
    for(let j = 0; j < height; ++j){
      let s = i/(width-1);
      let t = j/(height-1);
      let value = fn(s,t,i,j, width, height);
      let ix = components*(j*width + i);
      for(let c =0; c < components; ++c){
        texture[ix+c] = value[c];
      }
    }
  }

  let dt = new DataTexture(texture, width, height, THREE.RGBAFormat, THREE.FloatType);
  dt.needsUpdate = true;
  return dt;
}
export function updateTexture2With(width, height, components, texture, fn, Type = Float32Array){
  // let texture = new Type(width * height *components);
  for(let i = 0; i < width; ++i){
    for(let j = 0; j < height; ++j){
      let s = i/(width-1);
      let t = j/(height-1);
      let value = fn(s,t,i,j, width, height);
      let ix = components*(j*width + i);
      for(let c =0; c < components; ++c){
        texture[ix+c] = value[c];
      }
    }
  }

  let dt = new DataTexture(texture, width, height, THREE.RGBAFormat, THREE.FloatType);
  dt.needsUpdate = true;
  return dt;
}



function dimensions2d(total){
  let sqrt = Math.floor(Math.sqrt(total));
  let q = 2;
  let i = 1;
  while(++i){
    if(q >= sqrt) break;
    q = Math.pow(2,i);
  }
  let w = Math.pow(2, i-1);
  return [w, total/w];
}

export function prepareTexture3With(width, height, depth, components, fn){
  let texture = new Float32Array(width * height * depth * components);
  for(let i = 0; i < width; ++i){
    for(let j = 0; j < height; ++j){
      for(let k = 0; k < depth; ++k){
        let u = i/(width-1);
        let v = j/(height-1);
        let w = k/(depth-1);
        let value = fn(u,v,w, i,j,k, width, height,depth);
        let ix = components * ijkToIndex(i,j,k);
        for(let c =0; c < components; ++c){
          texture[ix+c] = value[c];
        }
      }
    }
  }
  let [width2, height2] = dimensions2d(width * height * depth);
  let dt;
  if(components === 4)
    dt = new DataTexture(texture, width2, height2, THREE.RGBAFormat, THREE.FloatType);
  else if(components === 3)
    dt = new DataTexture(texture, width2, height2, THREE.RGBFormat, THREE.FloatType);
  else throw "incorrect texture components";

  dt.needsUpdate = true;
  return {
    texture:dt,
    resolution: new Vector2(width2, height2),
    resolution3D: new Vector3(width, height, depth)
  };

  function ijkToIndex(i,j,k){
    let X = i*height + j;
    return X * depth + k;
  }
}

export function updateTexture4With(width, height, depth, count, components,  texture, precalcs, fn){
  let size = width * height * depth * count;
  // let texture = new Float32Array(size * components);
  let precalculations = {};
  for(let r =0; r < count; ++r){
    console.log(`count: ${r}/${count-1}`);
    precalculations = Object.assign(precalculations, precalcs.count(r, count, precalculations));
    for(let i = 0; i < width; ++i){
      precalculations = Object.assign(precalculations, precalcs.width(i, width, precalculations));
      for(let j = 0; j < height; ++j){
        precalculations = Object.assign(precalculations, precalcs.height(j, height, precalculations));
        for(let k = 0; k < depth; ++k){
          precalculations = Object.assign(precalculations, precalcs.depth(k, depth, precalculations));
          let value = fn(precalculations);
          let ix = components * ijkrToIndex(i,j,k,r);
          for(let c =0; c < components; ++c){
            texture[ix+c] = value[c];
          }
        }
      }
    }
  }
  let [width2, height2] = dimensions2d(size);
  let dt;
  if(components === 4)
    dt = new DataTexture(texture, width2, height2, THREE.RGBAFormat, THREE.FloatType);
  else if(components === 3)
    dt = new DataTexture(texture, width2, height2, THREE.RGBFormat, THREE.FloatType);
  else throw "incorrect texture components";

  dt.needsUpdate = true;
  return {
    texture:dt,
    resolution: new Vector2(width2, height2),
    resolution4D: new Vector4(width, height, depth, count)
  };

  function ijkrToIndex(i,j,k,r){
    let X = i*height + j;
    let XX = X * depth  + k
    return XX * count + r;
  }
}

export function prepareTexture4With(width, height, depth, count, components, precalcs, fn){
  let size = width * height * depth * count;
  let texture = new Float32Array(size * components);
  let precalculations = {};
  for(let r =0; r < count; ++r){
    console.log(`count: ${r}/${count-1}`);
    precalculations = Object.assign(precalculations, precalcs.count(r, count, precalculations));
    for(let i = 0; i < width; ++i){
      precalculations = Object.assign(precalculations, precalcs.width(i, width, precalculations));
      for(let j = 0; j < height; ++j){
        precalculations = Object.assign(precalculations, precalcs.height(j, height, precalculations));
        for(let k = 0; k < depth; ++k){
          precalculations = Object.assign(precalculations, precalcs.depth(k, depth, precalculations));
          let value = fn(precalculations);
          let ix = components * ijkrToIndex(i,j,k,r);
          for(let c =0; c < components; ++c){
            texture[ix+c] = value[c];
          }
        }
      }
    }
  }
  let [width2, height2] = dimensions2d(size);
  let dt;
  if(components === 4)
    dt = new DataTexture(texture, width2, height2, THREE.RGBAFormat, THREE.FloatType);
  else if(components === 3)
    dt = new DataTexture(texture, width2, height2, THREE.RGBFormat, THREE.FloatType);
  else throw "incorrect texture components";

  dt.needsUpdate = true;
  return {
    texture:dt,
    resolution: new Vector2(width2, height2),
    resolution4D: new Vector4(width, height, depth, count)
  };

  function ijkrToIndex(i,j,k,r){
    let X = i*height + j;
    let XX = X * depth  + k
    return XX * count + r;
  }
}

function generateIterativeAtmosphere(planetProps, 
                                     transmittanceTexture, 
                                     initialDeltaETexture,
                                     initialDeltaSRTexture,
                                     deltaSMTexture
                                    ){
  let {radius, atmosphereHeight, HR, betaR} = planetProps.phisical;
  let {resMu, resNu, resMus, resR} = planetProps;
  let width=resMus, 
      height=resNu, 
      depth=resMu, 
      count=resR;
  let pre = {};
  for(let k in precalcs){
    pre[k] = precalcs[k](planetProps);
  }

  let deltaJTexture = new Float32Array(width*height*depth*count*4); // 4d
  let deltaETexture = new Float32Array(initialDeltaETexture);
  let deltaSRTexture = new Float32Array(initialDeltaSRTexture); // 4d
  let irradianceTexture = new Float32Array(initialDeltaETexture.length);
  let inscatterTexture = new Float32Array(width*atmosphereHeight*depth*count*4); // 4d

  let deltaJGetter = getDeltaJPixel(planetProps, transmittanceTexture, deltaETexture, deltaSRTexture, deltaSMTexture);
  let deltaEGetter = getDeltaEIterativeColor(planetProps, deltaSRTexture, deltaSMTexture);
  let deltaSRGetter = getDeltaSRIterativeColor(planetProps, transmittanceTexture, deltaJTexture);
  let deltaSRCopier = getDeltaSRCopier(planetProps, deltaSRTexture);

  for(let layer =0; layer< planetProps.AtmosphereIterativeSamples; ++layer){
    calculateDeltaJ(layer);
    calculateDeltaE(layer);
    calculateDeltaSR(layer);
    incrementIrradiance(layer);
    incrementInscatter(layer);
  }
  return {};

  function calculateDeltaJ(iteration){
    console.log("------------- deltaJ",iteration, " ----------");
    updateTexture4With(resMus, resNu, resMu, resR, 4, deltaJTexture, pre, precalculations=>{
      return deltaJGetter(precalculations, iteration);
    })
  }

  function calculateDeltaE(iteration){
    console.log("------------- deltaE",iteration, " ----------");
    updateTexture2With(resMus/2, resR*2, 4, deltaETexture, (s,t,i,j,W,H)=>{
      return deltaEGetter({s,t,i,j,W,H}, iteration);
    });

  }
  function calculateDeltaSR(iteration){
    console.log("------------- deltaSR",iteration, " ----------");
    updateTexture4With(resMus, resNu, resMu, resR, 4, deltaSRTexture, pre, precalculations=>{
      return deltaSRGetter(precalculations, iteration);
    })
  }
  function incrementIrradiance(){
    console.log('----------------increment Irradiance------------');
    for(let i = 0; i < irradianceTexture.length; ++i){
      irradianceTexture[i] += deltaETexture[i];
    }
  }
  function incrementInscatter(){
    console.log('----------------increment Inscatter------------');
    let texture = prepareTexture4With(resMus, resNu, resMu, resR, 4, pre, deltaSRCopier);
    for(let i = 0; i< inscatterTexture.length; ++i){
      inscatterTexture[i] += texture[i];
    }

  }


}

export function generateAtmosphere(textureProperties, planetProperties){
  //   128    8      32      32
  let {resMu, resNu, resMus, resR} = textureProperties;
  let combinedProps = {...planetProperties, ...textureProperties};

  let transmittanceTexture = prepareTexture2With(resMu*2, resR*2, 4,(s,t,i,j,W,H)=>{
    return getTransmittenceColor({s,t,i,j,W,H}, combinedProps, false);
  });

  let deltaETexture = prepareTexture2With(resMus/2, resR*2, 4, (s,t,i,j,W,H)=>{
    return getDeltaEColor({s,t,i,j,W,H}, combinedProps, transmittanceTexture.image.data);
  });

  debugger;

  let pre = {};
  for(let k in precalcs){
    pre[k] = precalcs[k](combinedProps);
  }


  let rayPixelGetter = getDeltaSRayColor(combinedProps, transmittanceTexture.image.data);
  let miePixelGetter = getDeltaSMieColor(combinedProps, transmittanceTexture.image.data);

  let SRTexture = prepareTexture4With(resMus, resNu, resMu, resR, 4, pre, precalculations=>{
    let cl =  rayPixelGetter(precalculations);
    return cl;
  })

  let SMTexture = prepareTexture4With(resMus, resNu, resMu, resR, 4, pre, precalculations=>{
    let cl =  miePixelGetter(precalculations);
    return cl;
  })


  generateIterativeAtmosphere(combinedProps, 
                              transmittanceTexture.image.data,
                              deltaETexture.image.data,
                              SRTexture.texture.image.data,
                              SMTexture.texture.image.data
                             );


  return {
    transmittanceTexture,
    deltaETexture,
    deltaSRTexture: SRTexture.texture,
    deltaSRTexture4dResolution: SRTexture.resolution4D,
    deltaSRTextureResolution: SRTexture.resolution,

    deltaSMTexture: SMTexture.texture,
    deltaSMTexture4dResolution: SMTexture.resolution4D,
    deltaSMTextureResolution: SMTexture.resolution,
  }
}
