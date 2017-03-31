import * as THREE from 'three/src/constants.js';
import {DataTexture} from 'three/src/textures/DataTexture.js'
import {CubeTexture} from 'three/src/textures/CubeTexture.js'

const texelSize = 4;

export function getCubemap(){
 let images = [
    [1,0,0,1], 
    [0,0,1,1], 

    [1,1,0,1], 
    [1,0,1,1], 

    [0,1,0,1], 
    [0,1,1,1], 
  ].map((c,ix)=>createTextureOfColor(c, 32, ix));
  let cb = new CubeTexture;
  cb.images = images;
  cb.version = 1;
  return cb;
}

function createTextureOfColor(color, size, plane){
  let arr = new Uint8Array(size*size*texelSize);
  for(let i = 0; i< size; ++i){
    for(let j = 0; j< size; ++j){
      let ix = (i*size+j)*texelSize;
      color.forEach((c,cix)=>{
        arr[ix+cix] = c*255;
      });
    }
  }
  return new DataTexture(arr, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
}


