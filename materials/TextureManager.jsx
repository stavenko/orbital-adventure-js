import * as THREE from 'three/src/constants.js';
import {Vector3} from 'three/src/math/Vector3';
import {Vector4} from 'three/src/math/Vector4';
import ZipWorker from 'worker-loader!../Utils/zip/zipWorker.js';
import {DataTexture} from 'three/src/textures/DataTexture.js';

const TextureSize = 512;

export class WorldManager {
  constructor() {
    this.busy = false;
    this.unpackQueue = [];
    
    this.texturesIndex = {
      back: [],
      left: [],
      front: [],
      right: [],
      top: [],
      bottom: []
    };
    this.atmosphereTextureNames = [
      'deltaIrradianceTexture',
      'transmittanceTexture',
      'scatteringTexture'
    ];

    this.faceIx = {
      back: 0, left: 1, front: 2, right: 3,
      top: 4, bottom: 5
    };
    this.faceNames = ['back', 'left', 'front', 'right', 'top', 'bottom'];
    this.faceColors = [
      [1.0, 0, 0],
      [0, 1, 0 ],
      [1.0, 0.7, 0.7],
      [0.7, 1, 0.7 ],
      [0., 0., 1.0 ],
      [0.7, 0.7, 1.0 ],

    ];

    this.zipWorker = new ZipWorker();
    this.zipWorker.addEventListener('message', this.unpackComplete.bind(this));

    this.textures = [];
    this.serverGenerationTasks = {};
    // this.serverCheckInterval = setInterval(()=>this.checkServerTasks(), 2000);
    this.atmosphereTextures = {};
  }

  checkServerTasks() {
    const uuids = Object.keys(this.serverGenerationTasks);
    this.post(this.getWorldsHostUrl('/get-task-list-state'), uuids, (state) => {
      state = JSON.parse(state);
      for (const k in state) {
        if (state[k] == 'completed' || state[k] == 'notfound') {
          const value = this.serverGenerationTasks[k];
          if (value) {
            this.downloadTexture(value.url, value.type, value.params);
            delete this.serverGenerationTasks[k];
          }
        }
      }
    });
  }

  createRGBTextureFromFloat(texture) {
    const f32 = new Float32Array(texture);
    const s = TextureSize / 2;
    const C = 4;
    const ab = new Float32Array(s * s * C);
    for (let i = 0; i < s; ++i) {
      for (let j = 0; j < s; ++j) {
        const ix = i * s + j;
        
        const cix = ix * C;
        ab[cix] = f32[i * TextureSize + j];
        ab[cix + 1] = f32[(i + s) * TextureSize + j];
        ab[cix + 2] = f32[i * TextureSize + j + s];
        ab[cix + 3] = f32[(i + s) * TextureSize + j + s];
      }
    }
    return ab;
  }


  processUnpackedTexture(type, array, params) {
    if (type === 'height') {
      return {
        data: this.createRGBTextureFromFloat(array),
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        width: TextureSize / 2.0,
        height: TextureSize / 2.0
      };
    }
    if (type === 'normal') {
      return {
        data: new Uint8Array(array),
        format: THREE.RGBFormat,
        type: THREE.UnsignedByteType,
        width: TextureSize,
        height: TextureSize
      };
    }
    if (this.atmosphereTextureNames.indexOf(type) !== -1) {
      const fa = new Float32Array(array);
      const {resMu, resNu, resR, resMus} = params;
      const sz = fa.length / 4;
      let [w, h] = this.dimensions2d(sz);
      if (type == 'transmittanceTexture') {
        w = resMu * 2;
        h = resR * 2;
      } 
      if (type == 'deltaIrradianceTexture') {
        w = resMus * 2;
        h = resR / 2;

      } 
      console.log(type, w, h, fa);
      return {
        data: fa,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        width: w,
        height: h
      };
    }
  }

  unpackComplete(event) {
    const {key, textureType, texture} = event.data;
    const processedTexture = this.processUnpackedTexture(textureType, texture, event.data);
    this.texturesIndex[key].image = {
      width: processedTexture.width,
      height: processedTexture.height,
      data: processedTexture.data //__floatArr //new Uint8Array(texture)
    };
    this.texturesIndex[key].format = processedTexture.format; //THREE.RGBFormat;
    this.texturesIndex[key].type = processedTexture.type; //THREE.FloatType;
    this.texturesIndex[key].needsUpdate = true;
    this.busy = false;
    this.tryLaunchNextUnpack();
  }

  getWorldsHostUrl(path) {
    const host = window.location.hostname;
    const port = 8082;
    const proto = window.location.protocol;
    return `${proto}//${host}:${port}${path}`;
  }

  getWorldList(fn) {
    this.get(this.getWorldsHostUrl('/get-list'), response => {
      try {
        fn(JSON.parse(response));
      } catch (e) {
        console.error('coudn`t parse JSON', e);
      }
    });
  }

  get(url, fn) {
    const xhr = new XMLHttpRequest;
    xhr.open('GET', url);
    xhr.onload = () => fn(xhr.response);
    xhr.send();
  }

  post(url, data, fn) {
    const xhr = new XMLHttpRequest;
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    xhr.onload = () => fn(xhr.response);
    xhr.send(`json=${encodeURIComponent(JSON.stringify(data))}`);
  }
  
  createWorld(props, fn) {
    const url = this.getWorldsHostUrl('/create-world');
    this.post(url, props, fn);
  }

  downloadTexture(url, textureType, params) {
    this.download(url, array => {
      console.log(params);
      this.queueUnpack(array, url, textureType, params);
    });
  }

  tiledTexturesURL(forWorld, type, params) {
    const {face, lod, tile} = params;
    return `/texture/${forWorld}/${type}/${lod}/${face}/${tile}.raw`;
  }

  atmosphereTexturesURL(forWorld, type, params) {
    const {textureType} = params;
    const {resR, resMu, resMus, resNu} = params;
    return `/texture/${forWorld}/atmosphere/${resR}x${resMu}x${resMus}x${resNu}/${textureType}.raw`;

  }

  typeToURL(forWorld, type, params) {
    switch (type) {
      case 'height':
      case 'normal':
        return this.tiledTexturesURL(forWorld, type, params);
      default:
        return this.atmosphereTexturesURL(forWorld, type, params);
    }
  }

  getTexture(forWorld, type, params) {
    const url = this.getWorldsHostUrl(this.typeToURL(forWorld, type, params));
    if (this.texturesIndex[url]) {
      return this.texturesIndex[url];
    }
    const texture = new DataTexture(new Uint8Array(16), 2, 2, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    this.texturesIndex[url] = texture;
    this.checkIfTextureExists(url, err => {
      if (err) {
        return this.requestTextureGeneration(forWorld, type, params, url);
      }
      this.downloadTexture(url, type, params);
    });
    return texture;
  }

  checkIfTextureExists(url, cb) {
    const xhr = new XMLHttpRequest;
    xhr.open('HEAD', url);
    xhr.onloadend = () => {
      if (xhr.status == 404) {
        return cb('Not found');
      }
      cb();

    };
    xhr.send();
  }


  requestTextureGeneration(forWorld, type, params, url) {
    const data = {
      planetUUID: forWorld,
      textureType: type,
      ...params
    };
    const genUrl = this.getWorldsHostUrl('/generate-texture/');
    this.post(genUrl, data, (uuid) => {
      this.serverGenerationTasks[uuid] = {url, type, params};
    });
  }


  download(url, fn) {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      fn(xhr.response);
    };
    xhr.open('GET', url);
    xhr.send();
  }

  queueUnpack(array, key, textureType, params) {
    this.unpackQueue.push([{type: 'inflate', array, key, textureType, ...params}, [array]]);
    this.tryLaunchNextUnpack();
  }

  tryLaunchNextUnpack() {
    if (this.busy || this.unpackQueue.length == 0) {
      return;
    }
    const params = this.unpackQueue.shift();
    this.busy = true;
    this.zipWorker.postMessage(...params);
  }

  stToGeo(s, t, face) {
    const normal = this.stToNormal(s, t, face);

    const [x, y, z] = normal;

    const theta = Math.atan2(y, x);
    const r = Math.hypot(x, y);
    const phi = Math.atan2(z, r);

    return [theta, phi];
  }

  initialize(radius, division = 1, lod = 0) {
    let zc = 0;
    const {texturesIndex} = this;
    const res = 16;
    for (const ix in texturesIndex) {
      const zcolor = zc++ / 6;
      const textures = texturesIndex[ix];
      for (let i = 0; i < division; ++i) {
        for (let j = 0; j < division; ++j) {
          const s = i / division;
          const t = j / division;
          const tile = j * division + i;
          const color = this.faceColors[this.faceIx[ix]];
          const ab = new Uint8Array(res * res * 4);
          
          const faceNum = ix;
          
          for (let ii = 0; ii < res; ++ii) {
            for (let jj = 0; jj < res; ++jj) {
              const ss = ii / res / division;
              const tt = jj / res / division;
              const n = new Vector3(...this.stToNormal(s + ss, t + tt, faceNum)).normalize();
              let c = color;
              if (Math.abs(n.dot(new Vector3(1, 0, 0))) < 0.1) {
                c = [0, 1, 1];
              }

              let ix;
              ix = (jj * res + ii) * 4;
              ab[ix ] = c[0] * 255;
              ab[ix + 1] = c[1] * 255;
              ab[ix + 2] = c[2] * 255;
              ab[ix + 3] = 255;
            }
          }
          const tix = this.textures.push(ab) - 1;
          const geoBounds = [[0, 0], [0, 1], [1, 0], [1, 1]]
            .map(x => x.map((n, i) => n / division + [s, t][i]))
            .map(st => this.stToGeo(...st, ix))
            ;
          textures.push({t, s, tile, division, face: this.faceIx[ix], geoBounds, tix, lod, resolution: res });

        }
      }
    }
  }

  stToNormal(s, t, face) {

    const ss = s * 2 - 1;
    const tt = t * 2 - 1;

    return [
      [-1, -tt, ss], // back

      [ss, -1, -tt], // left
      [1, -tt, -ss], // front
      [ss, 1, tt], // right
      [ss, -tt, 1], // top
      [-ss, -tt, -1] // bottom
    ][face];
  }
  
  stToNormal_(s, t, face) {
    const faceIx = this.faceIx[face];
    const ss = s * 2 - 1;
    const tt = t * 2 - 1;

    if (face == 'back') { // 0
      const res = [-1, -tt, ss ];
      return res;
    }
    if (face == 'front') { // 2
      const res = [1, -tt, -ss];
      return res;
    }

    if (face == 'left') { // 1
      const res = [ss, -1.0, -tt];
      return res;
    }
    if (face == 'right') { // 3
      const res = [ss, 1.0, tt];
      return res;
    }

    if (face == 'top') { // 4
      const res = [ss, -tt, 1.0];
      return res;
    }

    if (face == 'bottom') { //5
      const res = [-ss, -tt, -1.0];
      return res;
    }
  }

  ditance(from, to, radius) {
    const diff = [0, 1].map(i => to[i] - from[i]);
    const a = Math.pow(Math.sin(diff[1] / 2), 2) + 
      Math.cos(from[1]) * Math.cos(to[1]) * Math.pow(Math.sin(diff[0] / 2), 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radius * c;
  }

  getHighestLod(viewSize, radius, distance) {
    const normalizedDistance = 1.0 / Math.min(1.0, distance / (radius));
    return Math.ceil(Math.log2(normalizedDistance));
  }

  determineFace(n) {
    const abs = Math.abs;
    const ax = abs(n.x);
    const ay = abs(n.y);
    const az = abs(n.z);

    if (ay > ax && ay > az) {
      if (n.y > 0.0) {
        return 3;
      } else {
        return 1;
      }
    } 

    if (ax > ay && ax > az) {
      if (n.x > 0.0) {
        return 2;
      } else {
        return 0;
      }
    }

    if (az > ay && az > ax) {
      if (n.z > 0.0) {
        return 4;
      } else {
        return 5;
      }
    }
  }

  determineST(n, f) {
    const abs = Math.abs;

    if (f == 2) {
      return vec2(-n.z / abs(n.x), -n.y / abs(n.x));
    } 
    if (f == 0) {
      return vec2(n.z / abs(n.x), -n.y / abs(n.x));
    } 

    if (f == 4) {
      return vec2(n.x / abs(n.z), -n.y / abs(n.z));
    } 
    if (f == 5) {
      return vec2(-n.x / abs(n.z), -n.y / abs(n.z));
    } 

    if (f == 3) {
      return vec2(n.x / abs(n.y), n.z / abs(n.y));
    } 
    if (f == 1) {
      return vec2(n.x / abs(n.y), -n.z / abs(n.y));
    } 

    function vec2(x, y) {
      return [x, y];
    }
  }
  allZeroLodFaces() {
    return [
      {face: 0, lod: 0, s: 0, t: 0, tile: 0},
      {face: 1, lod: 0, s: 0, t: 0, tile: 0},
      {face: 2, lod: 0, s: 0, t: 0, tile: 0},
      {face: 3, lod: 0, s: 0, t: 0, tile: 0},
      {face: 4, lod: 0, s: 0, t: 0, tile: 0},
      {face: 5, lod: 0, s: 0, t: 0, tile: 0},
    ];
  }
  lookupPosZ({face, lod, I, J}) {
    const size = Math.pow(2, lod);
    const s = J / size;
    const t = I / size;
    if (t >= 1) {
      return {face: 1, t: t - 1, s: s};
    } // face: -y
    if (t < 0) {
      return {face: 3, t: 1 + t, s: s};
    } // face: +y
    if (s >= 1) {
      return {face: 2, t: t, s: s - 1};
    } // face: +x
    if (s < 0) {
      return {face: 0, t: t, s: 1 + s};
    } // face: -x
    return {face, s, t};
  }

  lookupNegZ({face, lod, I, J}) {
    const size = Math.pow(2, lod);
    const s = J / size;
    const t = I / size;
    if (t >= 1) {
      return {face: 1, t: 2 - t, s: 1 - s};
    } // face: -z
    if (t < 0) {
      return {face: 3, t: -t, s: 1 - s};
    } // face: +z
    if (s >= 1) {
      return {face: 0, t: t, s: s - 1};
    } // face: -x
    if (s < 0) {
      return {face: 2, t: t, s: 1 + s};
    } // face: +x
    return {face, s, t};
  }

  lookupPosY({face, lod, I, J}) {
    const size = Math.pow(2, lod);
    const s = J / size;
    const t = I / size;
    if (t >= 1) {
      return {face: 4, t: 2 - t, s: s};
    } // face: +z
    if (t < 0) {
      return {face: 5, t: -t, s: 1 - s };
    } // face: -z
    if (s >= 1) {
      return {face: 2, t: s - 1, s: 1 - t };
    } // face: +x
    if (s < 0) {
      return {face: 0, t: -s, s: t };
    } // face: -x
    return {face, s, t};
  }

  lookupNegY({face, lod, I, J}) {
    const size = Math.pow(2, lod);
    const s = J / size;
    const t = I / size;
    if (t >= 1) {
      return {face: 5, t: 2 - t, s: 1 - s};
    } // face: -z
    if (t < 0) {
      return {face: 4, t: 1 + t, s: s};
    } // face: +z
    if (s >= 1) {
      return {face: 2, t: 2 - s, s: t};
    } // face: +x
    if (s < 0) {
      return {face: 0, t: s + 1, s: 1 - t};
    } // face: -x
    return {face, s, t};
  }


  lookupPosX({face, lod, I, J}) {
    const size = Math.pow(2, lod);
    const s = J / size;
    const t = I / size;
    if (t >= 1) {
      return {face: 1, t: s, s: 2 - t };
    } // face: -y
    if (t < 0) {
      return {face: 3, t: s, s: 1 + t };
    } // face: +y
    if (s >= 1) {
      return {face: 5, t: t, s: s - 1 };
    } // face: -z
    if (s < 0) {
      return {face: 4, t: t, s: 1 + s };
    } // face: +z
    return {face, s, t};
  }

  lookupNegX({face, lod, I, J}) {
    const size = Math.pow(2, lod);
    const s = J / size;
    const t = I / size;
    if (t >= 1) {
      return {face: 1, t: 1 - s, s: t - 1 };
    } // face: -y
    if (t < 0) {
      return {face: 3, t: s, s: -t };
    } // face: +y
    if (s >= 1) {
      return {face: 4, t: t, s: s - 1 };
    } // face: -z
    if (s < 0) {
      return {face: 5, t: t, s: 1 + s };
    } // face: +z
    return {face, s, t};
  }

  getAdjusentFaceTile({face, lod, I, J}) {
    let tileWithST = null;
    if (face == 2) {
      tileWithST = this.lookupPosX({face, lod, I, J});
    }
    if (face == 0) {
      tileWithST = this.lookupNegX({face, lod, I, J});
    }
    if (face == 1) {
      tileWithST = this.lookupNegY({face, lod, I, J});
    }
    if (face == 3) {
      tileWithST = this.lookupPosY({face, lod, I, J});
    }
    if (face == 4) {
      tileWithST = this.lookupNegZ({face, lod, I, J});
    }
    if (face == 5) {
      tileWithST = this.lookupPosZ({face, lod, I, J});
    }

    // distretize:

    const size = Math.pow(2, lod);
    if (lod > 0) {
      if (tileWithST.s * size == size) {
        tileWithST.s = 1 - 1 / size;
      }
      if (tileWithST.t * size == size) {
        tileWithST.t = 1 - 1 / size;
      }
    } else {
      tileWithST.s = 0;
      tileWithST.t = 0;
    }
    let ni = tileWithST.t * size,
      nj = tileWithST.s * size;

    const MAX = Math.pow(2, lod) - 1;
    const MAXT = MAX * Math.pow(2, lod) + MAX;
    const tile = nj * size + ni;
    if (tile > MAXT) {
      
    }

    return {I: ni, J: nj, tile, lod, ...tileWithST};
  }

  getAdjusentTiles(tile) {
    const {face, lod, I, J} = tile;
    const tiles = Math.pow(2, lod);

    const MAX = Math.pow(2, lod) - 1;
    const MAXT = MAX * Math.pow(2, lod) + MAX;
    const diffs = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]];

    const adjusentTiles = [];
    for (let i = 0; i < diffs.length; ++i) {
      const [di, dj] = diffs[i];
      const ni = I + di;
      const nj = J + dj;
      if (ni >= 0 && ni < tiles && nj >= 0 && nj < tiles) {
        const s = nj / tiles;
        const t = ni / tiles;
        const tileNum = nj * tiles + ni;
        if (tile > MAXT) {
          
        }
        adjusentTiles.push({s, t, tile: tileNum, face, lod});
      } else {
        adjusentTiles.push(this.getAdjusentFaceTile({face, lod, I: ni, J: nj}));

      }
    }
    return adjusentTiles;
  }

  
  getTileIndexesByNormalAndLOD(normal, lod) {
    const face = this.determineFace(normal);
    let [s, t] = this.determineST(normal, face);
    s = (s + 1) / 2;
    t = (t + 1) / 2;
    const size = 1 / Math.pow(2, lod);
    const J = Math.floor(s / size);
    const I = Math.floor(t / size);
    const tile = J * Math.pow(2, lod) + I;
    const MAX = Math.pow(2, lod) - 1;
    const MAXT = MAX * Math.pow(2, lod) + MAX;

    if (tile > MAXT) {
      
    }
    if (lod == 0) {
      return this.allZeroLodFaces();
    }
    const tile_ = {face, lod, tile, I, J, s: J * size, t: I * size};
    const adjucentHiLod = this.getAdjusentTiles(tile_);
    const tiles = [];
    if (lod > 1) {
      tiles.push(...this.allZeroLodFaces());
    }
    tiles.push(tile_, ...adjucentHiLod);
    if (lod > 0) {

      const size = 1 / Math.pow(2, lod - 1);
      const J = Math.floor(s / size);
      const I = Math.floor(t / size);
      const tile = J * Math.pow(2, lod) + I;
      const adjucentLowerLod = this.getAdjusentTiles({face, lod: lod - 1, tile, I, J, s: J * size, t: I * size});
      tiles.push(...adjucentLowerLod);
    }
    return tiles;

  }

  getTileIndexesByNormal(normal, radius, distanceToSurface) {
    const lod = this.getHighestLod(null, radius, distanceToSurface);
    return getTileIndexesByNormalAndLOD(normal, lod);
  }

  getTileIndexes(center, viewSize, radius, distanceToSurface) {
    // console.log('normalize distance', distanceToSurface/radius)
    const highestLod = this.getHighestLod(viewSize, radius, distanceToSurface) - 1;
    const lod = Math.max(0.0, highestLod - 1);
    const lowerLodTextures = this.getList(lod, center, viewSize, radius);
    let higherLod = [];
    if (highestLod > 0) {
      higherLod = this.getList(lod + 1, center, viewSize / 2, radius);
    }

    return [...lowerLodTextures, ...higherLod];

  }

  getList(lod, center, viewSize, radius) {



    const textures = [];
    const textureIndex = this.lodIndex[lod];
    for (let i = 0; i < textureIndex.length; ++i) {
      const {geoBounds, s, t, face, tile} = textureIndex[i];
      if (geoBounds.filter(geo => this.ditance(center, geo, radius) < viewSize).length > 0) {
        textures.push({s, t, face, tile, lod});
      }
    }
    return textures; 


  }

  getTexturePixelSize(radius, lod) {
    const L = Math.PI * 2 * radius;
    const division = Math.pow(2, lod) * 512;
    return L / 4 / division;
  }

  selectLod(pixelSize, radius) {
    let lod = 0;
    while (1) {
      const texPixelSize = this.getTexturePixelSize(radius, lod);
      console.log(texPixelSize, pixelSize);
      if (texPixelSize < pixelSize) {
        return lod;
      }
      ++lod;
    }
  }


  getTextureOfNormal(normal, lod) {
    const face = this.determineFace(normal);
    let [s, t] = this.determineST(normal, face);
    s = (s + 1) / 2;
    t = (t + 1) / 2;
    const size = 1 / Math.pow(2, lod);
    const J = Math.floor(s / size);
    const I = Math.floor(t / size);
    const tile = J * Math.pow(2, lod) + I;
    const MAX = Math.pow(2, lod) - 1;
    const MAXT = MAX * Math.pow(2, lod) + MAX;

    if (tile > MAXT) {
      
    }
    return {face, lod, tile, I, J, s: J * size, t: I * size};
  }

  dot(v, u) {
    return v[0] * u[0] + v[1] * u[1] + v[2] * u[2];
  }

  prefilterTexture(centerNormal, cameraDirection, tileAngle) {
    // return false;

    const cameraNormalDot = centerNormal.dot(cameraDirection);
    if (cameraNormalDot < -0.7 ) {
      return true; 
    }
    if (cameraNormalDot < -0.3 && tileAngle < 0.3 * Math.PI) {
      return true;
    }
    if (cameraNormalDot < -0.0 && tileAngle < 0.2 * Math.PI) {
      return true;
    }
    return false;
    
  }


  addTexture(to, tp, pvMatrix, cameraDirection, planetRotation, radius, position, unitPixelSize) {
    const {face, tile, lod} = tp;
    const length = radius * 2.0 * Math.PI;
    const division = Math.pow(2, lod);
    const tileAngle = Math.SQRT2 * Math.PI / division;
    const J = Math.floor(tile / division);
    const I = tile % division;
    const S = J / division;
    const T = I / division;
    const centerShift = 0.5 / division;
    // if (face != 2 ) return;

    const centerNormal = new Vector3(...this.stToNormal(S + centerShift, T + centerShift, face)).normalize();
    const cornerNormal = this.stToNormal(S, T, face);

    const sums = [[0, 0], [0, 1], [1, 0], [1, 1], [0, 0.5], [1, 0.5], [0.5, 0], [0.5, 1], [0.5, 0.5]];
    const cornerNormal2 = this.stToNormal(S, T + 1.0 / division, face);

    const maxSize = length / 4 / division;
    const pixelSize = maxSize / TextureSize;
    const tileCenterPosition = centerNormal.clone().multiplyScalar(radius); 
    // [centerNormal[0]*radius, centerNormal[1]*radius, centerNormal[2]*radius];
    const tileCornerPosition = [cornerNormal[0] * radius, cornerNormal[1] * radius, cornerNormal[2] * radius];
    const tileCornerPosition2 = [cornerNormal2[0] * radius, cornerNormal2[1] * radius, cornerNormal2[2] * radius];
    // if(face == 2)
    //  console.log('--f', centerNormal, tileCenterPosition);

    centerNormal.applyQuaternion(planetRotation);
    const sp = tileCenterPosition.applyQuaternion(planetRotation).add(position);
    //let cp = new Vector3(...tileCornerPosition).applyQuaternion(planetRotation).add(position);
    //let cp2 = new Vector3(...tileCornerPosition2).applyQuaternion(planetRotation).add(position);
    const pixelSizeAtCenter = unitPixelSize * sp.length();

    sp.applyProjection(pvMatrix);
    // cp.applyProjection(pvMatrix);
    // cp2.applyProjection(pvMatrix);
    const distance = 0.0;
    let texturePointWithin = false;
    for (let i = 0; i < sums.length; ++i) {
      const [ss, tt] = sums[i];
      const normal = this.stToNormal(S + ss / division, T + tt / division, face);
      const coord = new Vector3(...normal).normalize()
        .multiplyScalar(radius)
        .applyQuaternion(planetRotation)
        .add(position)
        .applyProjection(pvMatrix);
      if (Math.abs(coord.x) < 2 && Math.abs(coord.y) < 2) {
        texturePointWithin = true;
        // console.log(coord, lod, tile);
        break;
      }
    }

    // let distance1 = sp.distanceTo(cp);// Math.SQRT2;
    // let distance2 = sp.distanceTo(cp2);// Math.SQRT2;
    // let distance = Math.max(distance1, distance2);
    

    const normalization = Math.max(0.1, Math.abs(centerNormal.dot(cameraDirection)));

    if (this.prefilterTexture(centerNormal, cameraDirection, tileAngle)) {
      // console.log("prefilter");
      return;
    }


    if (pixelSize * normalization > 2 * pixelSizeAtCenter) {
      this.addUnderlyingTiles(tp, to, pvMatrix, cameraDirection, planetRotation, radius, position, unitPixelSize);
    } else {
      if (texturePointWithin) {
        const t = {...tp};
        t.s = S;
        t.t = T;
        to.push(t);
      }
    }
  }

  _componentCheck(x, dist) {
    if (Math.abs(x) < 1) {
      return true;
    }
    const posReturns = (x > 1.0) && (x - dist) < 1;
    const negReturns = (x < -1.0) && (x + dist) > -1;
    return posReturns || negReturns;
  }

  isWithinScreen(centerPointProjected, projectedDistanceToTileCorner) {
    // console.log(centerPointProjected)

    if ((Math.abs(centerPointProjected.x) < 1) && (Math.abs(centerPointProjected.y) < 1)) {
      return true;
    }

    const xCheck = this._componentCheck(centerPointProjected.x, projectedDistanceToTileCorner);
    const yCheck = this._componentCheck(centerPointProjected.y, projectedDistanceToTileCorner);

    const res = xCheck && yCheck;
    return res;
    /*

    if(centerPointProjected.x > 0.0 && Math.abs(centerPointProjected.x - projectedDistanceToTileCorner) < 1){
      return true;
    } 
    if(centerPointProjected.x < 0.0 && Math.abs(centerPointProjected.x + projectedDistanceToTileCorner) < 1){
      return true;
    } 
    if(centerPointProjected.y > 0.0 && Math.abs(centerPointProjected.y - projectedDistanceToTileCorner) < 1){
      return true;
    } 
    if(centerPointProjected.y < 0.0 && Math.abs(centerPointProjected.y + projectedDistanceToTileCorner) < 1){
      return true;
      }
      */ 
  }

  addUnderlyingTiles(tp, to, pvMatrix, cameraDirection, planetRotation, radius, position, unitPixelSize) {

    const {face, tile, lod} = tp;
    const division = Math.pow(2, lod);
    const divNext = Math.pow(2, lod + 1);
    let J = Math.floor(tile / division);
    let I = tile % division;
    J *= 2;
    I *= 2;
    const _tp = {...tp};
    _tp.lod = lod + 1;
    const tile1 = J * divNext + I;
    const tile2 = (J + 1) * divNext + I;
    const tile3 = J * divNext + I + 1;
    const tile4 = (J + 1) * divNext + I + 1;

    this.addTexture(to, {..._tp, tile: tile1}, pvMatrix, cameraDirection, planetRotation, radius, position, unitPixelSize);
    this.addTexture(to, {..._tp, tile: tile2}, pvMatrix, cameraDirection, planetRotation, radius, position, unitPixelSize);
    this.addTexture(to, {..._tp, tile: tile3}, pvMatrix, cameraDirection, planetRotation, radius, position, unitPixelSize);
    this.addTexture(to, {..._tp, tile: tile4}, pvMatrix, cameraDirection, planetRotation, radius, position, unitPixelSize);

  }
  findTexturesWithin(pvMatrix, camDirection, planetRotation, radius, position, pixel) {
    const collection = [];
    const faceProps = {tile: 0, lod: 0, s: 0, t: 0};
    for (let face = 0; face < 6; ++face) {
      this.addTexture(collection, {face, ...faceProps}, pvMatrix, camDirection, planetRotation, radius, position, pixel);

    }
    console.log('selected', collection.length);
    
    return collection;
  }

  getTexturesByNormalAndPixelSize(normal, pixelSize, radius) {
    const lod = this.selectLod(pixelSize, radius);
    return this.getTileIndexesByNormalAndLOD(normal, lod);
    //let tile = this.getTextureOfNormal(normal, lod);
    //return [tile];

  }

}
