import * as THREE from 'three/src/constants.js';
import {Vector3} from 'three/src/math/Vector3';
import ZipWorker from 'worker!../Utils/zip/zipWorker.js';
import {DataTexture} from 'three/src/textures/DataTexture.js'

export class WorldManager{
  constructor(){
    this.busy = false;
    this.unpackQueue = [];
    
    this.texturesIndex = {
      back: [],
      left: [],
      front: [],
      right: [],
      top: [],
      bottom: []
    }

    this.faceIx={
      back:0, left:1, front:2, right:3,
      top:4, bottom:5
    }
    this.faceNames = ['back', 'left', 'front', 'right', 'top', 'bottom'];
    this.faceColors = [
      [1.0, 0, 0],
      [0, 1, 0 ],
      [1.0, 0.7, 0.7],
      [0.7, 1, 0.7 ],
      [0., 0., 1.0 ],
      [0.7, 0.7, 1.0 ],

    ]

    this.zipWorker = new ZipWorker();
    this.zipWorker.addEventListener('message',this.unpackComplete.bind(this))

    this.textures = [];
    this.serverGenerationTasks = {};
    this.createLodIndex();
    this.serverCheckInterval = setInterval(()=>this.checkServerTasks(), 2000);
  }

  checkServerTasks(){
    let uuids = Object.keys(this.serverGenerationTasks);
    this.post(this.getWorldsHostUrl('/get-task-list-state'), uuids, (state)=>{
      state = JSON.parse(state);
      for(let k in state){
        if(state[k] == 'completed' || state[k] == 'notfound'){
          let url = this.serverGenerationTasks[k];
          if(url){
            this.downloadTexture(url);
            delete this.serverGenerationTasks[k]
          }
        }
      }
    })
  }
  unpackComplete(event){
    let {key, texture} = event.data;
    this.texturesIndex[key].image={
      width: 2048,
      height: 2048,
      data: new Uint8Array(texture)
    }
    this.texturesIndex[key].needsUpdate = true;
    this.busy = false;
    this.tryLaunchNextUnpack();
  }

  getWorldsHostUrl(path){
    let host = window.location.hostname;
    let port = 8082;
    let proto = window.location.protocol;
    return `${proto}//${host}:${port}${path}`;
  }

  getWorldList(fn) {
    this.get(this.getWorldsHostUrl('/get-list'), response=>{
      try{
        fn(JSON.parse(response));
      }catch(e){
        console.error('coudn`t parse JSON', e);
      }
    })
  }

  get(url, fn){
    let xhr = new XMLHttpRequest;
    xhr.open('GET', url);
    xhr.onload = ()=>fn(xhr.response);
    xhr.send();
  }

  post(url, data, fn){
    let xhr = new XMLHttpRequest;
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    xhr.onload = ()=>fn(xhr.response);
    xhr.send(`json=${encodeURIComponent(JSON.stringify(data))}`);
  }
  
  createWorld(props, fn){
    let url = this.getWorldsHostUrl('/create-world');
    this.post(url, props, fn);
  }

  downloadTexture(url) {
    this.download(url, array=>{
      this.queueUnpack(array, url);
    })
  }

  getTexture(forWorld, type, params){
    let {face, lod, tile} = params;
    console.log("get texture", face, lod, tile);
    if(lod == 1 && tile > 3)
      debugger;
    let url = this.getWorldsHostUrl(`/texture/${forWorld}/${type}/${lod}/${face}/${tile}.raw`);
    if(this.texturesIndex[url])
      return this.texturesIndex[url];
    let texture = new DataTexture(new Uint8Array(16), 2, 2, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.texturesIndex[url] = texture;
    this.checkIfTextureExists(url, err=>{
      if(err) return this.requestTextureGeneration(forWorld, type, params, url)
      this.downloadTexture(url);
    })
    return texture;
  }

  checkIfTextureExists(url, cb){
    let xhr = new XMLHttpRequest;
    xhr.open('HEAD', url);
    xhr.onloadend = ()=>{
      if(xhr.status == 404)
        return cb("Not found");
      cb();

    }
    xhr.send();
  }


  requestTextureGeneration(forWorld, type, params, url){
    console.log('request', url);
    let data = {
      planetUUID: forWorld,
      textureType: type,
      ...params
    }
    let genUrl = this.getWorldsHostUrl('/generate-texture/');
    this.post(genUrl, data, (uuid)=>{
      this.serverGenerationTasks[uuid] = url;
    })
  }


  download(url, fn){
    console.log('download', url);

    let xhr = new XMLHttpRequest();
    xhr.responseType = 'arraybuffer';
    xhr.onload= ()=>{
      fn(xhr.response);
    }
    xhr.open('GET', url);
    xhr.send();
  }

  queueUnpack(array, key){
    this.unpackQueue.push([{type:'inflate', array, key}, [array]])
    this.tryLaunchNextUnpack();
  }

  tryLaunchNextUnpack(){
    if(this.busy || this.unpackQueue.length == 0) return;
    let params = this.unpackQueue.shift();
    this.busy = true;
    this.zipWorker.postMessage(...params);
  }

  stToGeo(s,t,face){
    let normal = this.stToNormal(s,t, face);

    let [x,y,z] = normal;

    let theta = Math.atan2(y, x);
    let r = Math.hypot(x, y);
    let phi = Math.atan2(z, r);

    return [theta, phi];
  }

  createLodIndex(){
    this.lodIndex = []
    const maxLOD = 8;
    const faces = 6;
    for(let lod = 0; lod < maxLOD; ++lod){
      let division = Math.pow(2,lod);
      let inc = 1.0 / division;
      this.lodIndex.push([]);
      for(let face =0; face < faces; ++face){
        for(let i = 0; i < division; ++i){
          for(let j = 0; j < division; ++j){
            let s = i * inc;
            let t = j * inc;
            let tile = j * division + i;
            let geoBounds = [[0,0], [0,1], [1,0], [1,1]]
              .map(x=>x.map((n,i)=>n*inc+[s,t][i]))
              .map(st=>this.stToGeo(...st, this.faceNames[face]));
            this.lodIndex[lod].push({geoBounds, s, t, tile, face});
          }
        }
      }
    }
  }

  initialize(radius, division=1, lod = 0){
    let zc = 0;
    let {texturesIndex} = this;
    let res = 16;
    for(let ix in texturesIndex){
      let zcolor = zc++ / 6;
      let textures = texturesIndex[ix];
      for(let i =0; i < division; ++i){
        for(let j=0; j < division; ++j){
          let s = i / division;
          let t = j / division;
          let tile = j * division + i;
          let color = this.faceColors[this.faceIx[ix]];
          let ab = new Uint8Array(res*res*4);
          
          let faceNum = ix;
          
          for(let ii = 0; ii < res; ++ii){
            for(let jj = 0; jj < res; ++jj){
              let ss = ii / res /division;
              let tt = jj / res /division;
              let n = new Vector3(...this.stToNormal(s + ss, t+tt, faceNum)).normalize();
              let c = color;
              if(Math.abs(n.dot(new Vector3(1, 0,0))) < 0.1)
                 c = [0,1,1]

              let ix;
              ix = (jj*res+ii)*4;
              ab[ix ] = c[0]*255;
              ab[ix+1] = c[1]*255;
              ab[ix+2] = c[2]*255;
              ab[ix+3] = 255;
            }
          }
          let tix = this.textures.push(ab)-1;
          let geoBounds = [[0,0], [0,1], [1,0], [1,1]]
            .map(x=>x.map((n,i)=>n/division+[s,t][i]))
            .map(st=>this.stToGeo(...st, ix))
            ;
          textures.push({t,s, tile, division, face:this.faceIx[ix] ,geoBounds, tix, lod, resolution:res });

        }
      }
    }
  }
  
  stToNormal(s,t, face){
    let faceIx = this.faceIx[face];
    let ss = s * 2 - 1;
    let tt = t * 2 - 1;

    if(face == 'back'){
      let res = [-1, -tt, ss ]
      return res;
    }
    if(face == 'front'){
      let res = [1, -tt, -ss];
      return res;
    }

    if(face == 'left'){
      let res = [ss, -1.0, -tt];
      return res;
    }
    if(face == 'right'){
      let res = [ss, 1.0, tt];
      return res;
    }

    if(face == 'top'){
      let res = [ss, -tt, 1.0];
      return res;
    }

    if(face == 'bottom'){
      let res = [-ss, -tt, -1.0];
      return res;
    }
  }

  ditance(from,to, radius){
    let diff = [0,1].map(i=>to[i] - from[i]);
    let a = Math.pow(Math.sin(diff[1]/2),2) + 
      Math.cos(from[1]) * Math.cos(to[1]) * Math.pow(Math.sin(diff[0]/2),2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return radius * c;
  }

  getHighestLod(viewSize, radius, distance){
    let normalizedDistance = 1.0 / Math.min(1.0, distance/(radius*3));
    return Math.ceil(Math.log2(normalizedDistance));
  }

  determineFace(n){
    let abs = Math.abs;
    let ax = abs(n.x);
    let ay = abs(n.y);
    let az = abs(n.z);

    if(ay > ax && ay > az){
      if(n.y > 0.0) return 3;
      else return 1;
    } 

    if(ax > ay && ax > az){
      if(n.x > 0.0) return 2;
      else return 0;
    }

    if(az > ay && az > ax){
      if(n.z > 0.0) return 4;
      else return 5;
    }
  }

  determineST(n, f){
    let abs = Math.abs;

    if(f == 2) return vec2(-n.z/ abs(n.x), -n.y/abs(n.x)); 
    if(f == 0) return vec2(n.z/ abs(n.x), -n.y/abs(n.x)); 

    if(f == 4) return vec2(n.x/ abs(n.z), -n.y/abs(n.z)); 
    if(f == 5) return vec2(-n.x/ abs(n.z), -n.y/abs(n.z)); 

    if(f == 3) return vec2(n.x/ abs(n.y), n.z/abs(n.y)); 
    if(f == 1) return vec2(n.x/ abs(n.y), -n.z/abs(n.y)); 

    function vec2(x,y){
      return [x,y];
    }
  }
  allZeroLodFaces(){
    return [
      {face:0, lod:0, s:0, t:0, tile:0},
      {face:1, lod:0, s:0, t:0, tile:0},
      {face:2, lod:0, s:0, t:0, tile:0},
      {face:3, lod:0, s:0, t:0, tile:0},
      {face:4, lod:0, s:0, t:0, tile:0},
      {face:5, lod:0, s:0, t:0, tile:0},
    ]
  }
  lookupPosZ({face, lod, I, J}){
    let size = Math.pow(2,lod);
    let s = J / size;
    let t = I / size;
    if(t >= 1) return {face: 1, t: t-1, s:s} // face: -y
    if(t  < 0) return {face: 3, t: 1+t, s:s} // face: +y
    if(s >= 1) return {face: 2, t: t, s:s-1} // face: +x
    if(s  < 0) return {face: 0, t: t, s:1+s} // face: -x
    return {face, s,t}
  }

  lookupNegZ({face, lod, I, J}){
    let size = Math.pow(2,lod);
    let s = J / size;
    let t = I / size;
    if(t >= 1) return {face: 1, t: 2-t, s:1-s} // face: -z
    if(t  < 0) return {face: 3, t: -t , s:1-s} // face: +z
    if(s >= 1) return {face: 0, t: t, s: s-1} // face: -x
    if(s  < 0) return {face: 2, t: t, s: 1+s} // face: +x
    return {face, s,t}
  }

  lookupPosY({face, lod, I, J}){
    let size = Math.pow(2,lod);
    let s = J / size;
    let t = I / size;
    if(t >= 1) return {face: 4, t: 2-t, s: s} // face: +z
    if(t  < 0) return {face: 5, t: -t, s:1-s } // face: -z
    if(s >= 1) return {face: 2, t: s-1, s: 1-t } // face: +x
    if(s  < 0) return {face: 0, t: -s, s: t  } // face: -x
    return {face, s,t}
  }

  lookupNegY({face, lod, I, J}){
    let size = Math.pow(2,lod);
    let s = J / size;
    let t = I / size;
    if(t >= 1) return {face: 5, t: 2-t, s:1-s} // face: -z
    if(t  < 0) return {face: 4, t: 1+t, s:s} // face: +z
    if(s >= 1) return {face: 2, t: 2-s, s:t} // face: +x
    if(s  < 0) return {face: 0, t: s+1, s:1-t} // face: -x
    return {face, s,t}
  }


  lookupPosX({face, lod, I, J}){
    let size = Math.pow(2,lod);
    let s = J / size;
    let t = I / size;
    if(t >= 1) return {face: 1, t: s, s: 2-t } // face: -y
    if(t  < 0) return {face: 3, t: s, s: 1+t } // face: +y
    if(s >= 1) return {face: 5, t: t, s: s-1 } // face: -z
    if(s  < 0) return {face: 4, t: t, s: 1+s } // face: +z
    return {face, s,t}
  }

  lookupNegX({face, lod, I, J}){
    let size = Math.pow(2,lod);
    let s = J / size;
    let t = I / size;
    if(t >= 1) return {face: 1, t: 1-s, s: t-1 } // face: -y
    if(t  < 0) return {face: 3, t: s,   s: -t } // face: +y
    if(s >= 1) return {face: 4, t: t,   s: s-1 } // face: -z
    if(s  < 0) return {face: 5, t: t,   s: 1+s } // face: +z
    return {face, s,t}
  }

  getAdjusentFaceTile({face, lod, I,J}){
    let tileWithST = null;
    if(face == 2){
      tileWithST = this.lookupPosX({face,lod,I,J});
    }
    if(face == 0){
      tileWithST = this.lookupNegX({face,lod,I,J});
    }
    if(face == 1){
      tileWithST = this.lookupNegY({face,lod,I,J});
    }
    if(face == 3){
      tileWithST = this.lookupPosY({face,lod,I,J});
    }
    if(face == 4){
      tileWithST = this.lookupNegZ({face,lod,I,J});
    }
    if(face == 5){
      tileWithST = this.lookupPosZ({face,lod,I,J});
    }

    // distretize:

    let size = Math.pow(2,lod);
    if(lod > 0){
      if(tileWithST.s*size == size){
        tileWithST.s = 1 - 1/size;
      }
      if(tileWithST.t*size == size){
        tileWithST.t = 1 - 1/size;
      }
    }else{
      tileWithST.s = 0;
      tileWithST.t = 0;
    }
    let ni = tileWithST.t*size,
        nj = tileWithST.s*size;

    let MAX = Math.pow(2,lod)-1;
    let MAXT = MAX * Math.pow(2,lod) + MAX;
    let tile = nj*size + ni;
    if(tile > MAXT) debugger;

    return {I:ni, J:nj, tile, lod, ...tileWithST}
  }

  getAdjusentTiles(tile){
    let {face,lod, I,J} = tile
    let tiles = Math.pow(2,lod);

    let MAX = Math.pow(2,lod)-1;
    let MAXT = MAX * Math.pow(2,lod) + MAX;
    let diffs = [
      [-1,-1], [-1,0], [-1,1],
      [0,-1], [0,0], [0,1],
      [1,-1], [1,0], [1,1]];

    let adjusentTiles = [];
    for(let i = 0; i<diffs.length; ++i){
      let [di,dj]  = diffs[i];
      let ni = I + di;
      let nj = J + dj;
      if(ni >= 0 && ni < tiles && nj >= 0 && nj < tiles){
        let s = nj / tiles;
        let t = ni / tiles;
        let tileNum = nj * tiles + ni;
        if(tile > MAXT) debugger;
        adjusentTiles.push({s, t, tile:tileNum, face, lod});
      }else{
        adjusentTiles.push(this.getAdjusentFaceTile({face, lod, I:ni, J:nj}));

      }
    }
    return adjusentTiles;
  }

  getTileIndexesByNormal(normal, radius, distanceToSurface){
    let lod = this.getHighestLod(null, radius, distanceToSurface);
    let face = this.determineFace(normal);
    let [s,t] = this.determineST(normal, face);
    s = (s+1) / 2;
    t = (t+1) / 2;
    let size = 1/ Math.pow(2, lod);
    let J = Math.floor(s / size);
    let I = Math.floor(t / size);
    let tile = J *Math.pow(2,lod) + I;
    let MAX = Math.pow(2,lod)-1;
    let MAXT = MAX * Math.pow(2,lod) + MAX;

    if(tile > MAXT) debugger;
    if(lod == 0) return this.allZeroLodFaces();
    let tile_ = {face, lod, tile, I, J, s:J*size,t:I*size}
    let tiles = [tile_, ...this.getAdjusentTiles(tile_)];
    if(lod > 0){
      let size = 1/ Math.pow(2, lod-1);
      let J = Math.floor(s / size);
      let I = Math.floor(t / size);
      let tile = J *Math.pow(2,lod) + I;
      tiles.push(...this.getAdjusentTiles({face, lod:lod-1, tile, I, J, s:J*size, t:I*size}))
    }

    return tiles


  }

  getTileIndexes(center, viewSize, radius, distanceToSurface){
    // console.log('normalize distance', distanceToSurface/radius)
    let highestLod = this.getHighestLod(viewSize, radius, distanceToSurface) - 1;
    let lod = Math.max(0.0, highestLod - 1);
    let lowerLodTextures = this.getList(lod, center, viewSize, radius);
    let higherLod = [];
    if(highestLod > 0)
      higherLod = this.getList(lod+1, center, viewSize/2, radius);

    return [...lowerLodTextures, ...higherLod];

  }

  getList(lod, center, viewSize, radius){



    let textures = [];
    let textureIndex = this.lodIndex[lod];
    for(let i =0; i < textureIndex.length; ++i){
      let {geoBounds, s,t,face, tile} = textureIndex[i];
      if(geoBounds.filter(geo=>this.ditance(center, geo, radius) < viewSize).length > 0) 
        textures.push({s,t,face, tile, lod});
    }
    return textures; 


  }

}
