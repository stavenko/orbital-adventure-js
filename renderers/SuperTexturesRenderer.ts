import * as THREE from "three";

import {normal2Cube, cube2Normal, getFaceBasis, CubeCoords} from '../math/cubeMap';


import VertexShader from '!raw-text-loader!../shaders/lod/super/pre-surface-vert.glsl';
import heightMapShader from '!raw-text-loader!../shaders/lod/super/render-heightmap.glsl';

type BasisPair = [THREE.Vector3, THREE.Vector3];

class Optional<T>{
  private constructor(...args) {
    if (args.length > 0) {
      const v = arguments[0];
      this.value = v;
      this._hasValue = true;
    } else {
      this._hasValue = false;
    }
  }

  private value: T | undefined;
  private _hasValue: boolean;

  get() {
    return this.value;
  }

  get hasValue() {
    return this._hasValue;
  }

  static init<T>(arg:T):Optional<T> {
    return  new Optional<T>(arg);
  }

  static none():Optional<undefined> {
    return new Optional;
  }
}

const MaxLod:number = 22;
const MaxLodCoefficient = Math.pow(2, MaxLod);

class TextureDescriptor{
  constructor(lod:number, coords: CubeCoords, basisOfSurface: [THREE.Vector3, THREE.Vector3], horizonDistance:number, radius: number, permutationTable: THREE.Texture){
    this.lod = lod;

    this.radius = radius;
    this.coords = coords;
    this.basisOfSurface = basisOfSurface;
    this.textureSize = horizonDistance;
    this.PermutationTable = permutationTable;
    this.hash = ['L:', lod, ', ST:', coords.st.x, ' x ', coords.st.y, ', F:', coords.face, ', H:', horizonDistance].join('');
  }
  lod: number;
  radius: number;
  coords: CubeCoords;
  textureSize: number
  hash: string;
  basisOfSurface: [THREE.Vector3, THREE.Vector3];
  PermutationTable: THREE.Texture
}

interface SpatialProperties{
  radius:  number;
  position: [number, number, number];

}
interface TextureCache{
  permutationTable: THREE.Texture;
}

interface Planet {
  spatial: SpatialProperties;
  texturesCache: TextureCache;
  table: Array<number>
}

class Texture {
  descriptor: TextureDescriptor;
  framebuffer: THREE.WebGLRenderTarget;
  constructor(d:TextureDescriptor, fb: THREE.WebGLRenderTarget){
    this.descriptor = d;
    this.framebuffer = fb;
  }
}

class LODObject{
  private current: Texture;
  private old: Texture | null;
  private requests: number;
  constructor(t: Texture, lodo?: LODObject){
    this.current = t;
    if (lodo){
      this.old = lodo.current;
    } else {
      this.old = null;
    }
    this.requests = 0;
  }

  get texture():Texture {
    if (this.requests < 2) {
      ++this.requests;
      return this.old;
    } else {
      ++this.requests;
      return this.current;
    }
  }
}


export class SuperTextureRenderer {
  readonly NormalTileSteps: number =  3;
  readonly Divisor: number =  this.NormalTileSteps - 1;
  readonly renderer: THREE.WebGLRenderer;
  readonly lodMap:  Map<number, THREE.WebGLRenderTarget>;
  readonly lodsMap:  Map<number, LODObject>;
  readonly tdMap: Map<number, TextureDescriptor>;
  readonly screenSpaceMesh: THREE.Mesh;
  readonly screenSpaceScene: THREE.Scene;
  readonly __notUsedCamera: THREE.PerspectiveCamera;
  readonly heightMapMaterial: THREE.RawShaderMaterial;
  readonly renderFn: (m:THREE.Mesh, c:THREE.Camera, fb?:THREE.WebGLRenderTarget)=>void;
  readonly framebufferPool: Array<THREE.WebGLRenderTarget> = [];
  private framebufferPointer: number;
 
  constructor(r: THREE.WebGLRenderer, renderFn:(m:THREE.Mesh, c:THREE.Camera, fb:THREE.WebGLRenderTarget)=>void) {
    this.renderer = r;
    this.lodMap = new Map;
    this.lodsMap = new Map;
    this.tdMap = new Map;
    this.renderFn = renderFn;
    this.__notUsedCamera = new THREE.PerspectiveCamera();
    this.heightMapMaterial = new THREE.RawShaderMaterial({
      uniforms: { },
      vertexShader: VertexShader,
      fragmentShader: heightMapShader,
      transparent: false
    });
    this.screenSpaceMesh = this.getScreenSpaceMesh();
    this.screenSpaceScene = new THREE.Scene;
    this.screenSpaceScene.add(this.screenSpaceMesh);
    for (let i = 0; i < 10; i++) {
      this.framebufferPool[i] = new THREE.WebGLRenderTarget(512, 512, {
      type: THREE.FloatType,
      format:THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false
    });
    }
    this.framebufferPointer = 0;
  }

  createPermutationTable(forWorld: Planet): THREE.Texture {
    const f = new Float32Array(512 * 4);
    for (let i = 0; i < 512; ++i) {
      const ix = i & 255;
      f[i * 3] = forWorld.table[ix];
      f[i * 3 + 1] = forWorld.table[ix];
      f[i * 3 + 2] = forWorld.table[ix];
      f[i * 3 + 3] = 1.0;
    }
    return new THREE.DataTexture(f, 32, 16, THREE.RGBAFormat, THREE.FloatType);
  }

  getScreenSpaceMesh():THREE.Mesh {
    const geom = new THREE.BufferGeometry();
    const vtx = new Float32Array([
      -1, -1,
      1, -1,
      1, 1,
      -1, 1
    ]);
    const ind = new Uint16Array([0, 1, 2, 0, 2, 3]);
    geom.addAttribute('sspoint', new THREE.BufferAttribute(vtx, 2, false));
    geom.setIndex(new THREE.BufferAttribute(ind, 1));
    const mesh = new THREE.Mesh(geom, this.heightMapMaterial);
    // const mesh = new THREE.Mesh(bbb, new THREE.MeshBasicMaterial({color: 0xffffff}));
    this.heightMapMaterial.needsUpdate = true;
    this.heightMapMaterial.extensions.derivatives = true;

    mesh.frustumCulled = false;
    return mesh;
  }

  getNextFramebuffer() {
    const id = this.framebufferPointer;
    this.framebufferPointer = (++this.framebufferPointer) % this.framebufferPool.length;
    return this.framebufferPool[id];
  }

  getTexture(td: TextureDescriptor): [TextureDescriptor, THREE.Texture] | null {
    const lod = this.lodsMap.get(td.lod);
    if (!lod) {
      const fb = this.getNextFramebuffer();
      const texture = new Texture(td, fb);
      const lodObject = new LODObject(texture);
      this.lodsMap.set(td.lod, lodObject);
      this.prepareTexture(texture);
      return null;
    } else {
      const t = lod.texture;
      if  (!t) {
        return null;
      }
      if(t.descriptor.hash == td.hash) {
        return [t.descriptor, t.framebuffer.texture];
      } else {
        const fb = this.getNextFramebuffer();
        const texture = new Texture(td, fb);
        const lodObject = new LODObject(texture, lod);
        this.lodsMap.set(td.lod, lodObject);
        this.prepareTexture(texture);
        return [lodObject.texture.descriptor, lodObject.texture.framebuffer.texture];
      }
    }
      
    /*
    if (this.tdMap.has(td.lod)) {
      const otd = this.tdMap.get(td.lod);
      if (otd.hash == td.hash) {
        return [td, this.lodMap.get(td.lod).texture];
      } else {
        this.prepareTexture(td);
        return [otd, this.lodMap.get(td.lod).texture];
      }
    }
    this.prepareTexture(td);
    return null
     */
  }

  prepareTexture(texture: Texture):void {
    this.renderFramebuffer(texture.descriptor, texture.framebuffer);
  }

  renderFramebuffer(td: TextureDescriptor, fb: THREE.WebGLRenderTarget): void {
    this.setupUniforms(td);

    console.log('rerender', td.lod, td.textureSize, td.coords.st.x);
    this.renderFn(this.screenSpaceMesh, this.__notUsedCamera, fb);
  }

  setupUniforms(td: TextureDescriptor): void {
    const ufs = this.heightMapMaterial.uniforms;
    ufs.face = {value: td.coords.face};
    ufs.textureCenter = {value: td.coords.st};
    ufs.textureHorizont = {value: td.textureSize};
    ufs.radius = {value: td.radius};
    ufs.basisT = {value: td.basisOfSurface[1]};
    ufs.basisS = {value: td.basisOfSurface[0]};
    ufs.permutationTable = {value: td.PermutationTable};
    ufs.permutationTableSize = {value: new THREE.Vector2(32, 16)};
  }

  getSurfaceBasis(c: CubeCoords): BasisPair {
    const [X, Y, Z] = getFaceBasis(c.face);
    const pointNormal = cube2Normal(c);
    const rotation = this.getRotation(Z, pointNormal);
    const XX = X.clone().applyQuaternion(rotation);
    const YY = Y.clone().applyQuaternion(rotation);
    const CC = new THREE.Vector3().crossVectors(XX, YY);
    if (CC.dot(pointNormal) > 0)
      XX.negate();
    const ww: BasisPair = [XX, YY];
    return ww;
  }

  getRotation(f,t: THREE.Vector3): THREE.Quaternion {
    const axis = new THREE.Vector3().crossVectors(f, t).normalize();
    const angle = f.angleTo(t);
    return new THREE.Quaternion().setFromAxisAngle(axis, angle);
  }

  createFramebuffer(lod: number): void {
    const fb = new THREE.WebGLRenderTarget(512, 512, {
      type: THREE.FloatType,
      format:THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.lodMap.set(lod, fb);
  }


  getMaxDistanceForLod(lod, planetRadius, fovFactor:number):number {
    const normalized = Math.pow(2, MaxLod - lod) / MaxLodCoefficient;
    return normalized * this.getMaxLodDistance(planetRadius, fovFactor);
  }

  getLodsArray(planet:Planet, globalPosition: THREE.Vector3, pixelFovRatio:number): Array<number> {
    const lod = this.findLowestLod(planet, globalPosition, pixelFovRatio);
    const lods = [];
    lods.push(lod);
    for(let i = 1; i < 3; ++i) {
      const nl = lod - i;
      if (nl < 0 ) return lods;
      lods.push(nl);
    }
    return lods;
  }

  getMaxHorizontDistance(planet:Planet): number {
    return planet.spatial.radius * Math.PI / 2.0;
  }

  getLodDistances(lods: Array<number>, planet:Planet, globalPosition: THREE.Vector3, pixelFovRatio:number): Array<number> {
    const biggestLod = lods[lods.length - 1];
    const maxDistanceForLod = planet.spatial.radius + this.getMaxDistanceForLod(biggestLod, planet.spatial.radius, pixelFovRatio);
    const maxHorizontDistance = Math.acos(planet.spatial.radius / maxDistanceForLod) * planet.spatial.radius;
    const distances = [];

    for( let i = 0; i < lods.length; ++i) {
      if (lods[i] === 0 && maxDistanceForLod < this.getDistanceToSurface(planet, globalPosition)) {
        distances.push(this.getMaxHorizontDistance(planet));
      } else {
        const multiplier = lods.length - i;
        const divider = Math.pow(3, multiplier - 1);
        distances.push(maxHorizontDistance / divider);
      }
    }
    return distances;
  }

  getTexturesDescriptorAt(planet:Planet, globalPosition: THREE.Vector3, planetRotation: THREE.Quaternion, pixelFovRatio:number):Array<TextureDescriptor>{
    const lods = this.getLodsArray(planet, globalPosition, pixelFovRatio);
    const distances = this.getLodDistances(lods, planet, globalPosition, pixelFovRatio);
    const result: Array<TextureDescriptor> = [];
    const sphereCoordsNormal = this.findNormal(planet, planetRotation, globalPosition);
    if (!planet.texturesCache.permutationTable) {
      planet.texturesCache.permutationTable = this.createPermutationTable(planet);
      planet.texturesCache.permutationTable.needsUpdate = true;
    }
    return lods.map((lod, ix) => {
      const coords:CubeCoords = normal2Cube(sphereCoordsNormal);
      const currentNormalSteps = this.NormalTileSteps * lod;
      const divider = Math.pow(3, lod + 1);
      const alignedCoords = alignToNet(coords, divider);
      const basisAtNormal = this.getSurfaceBasis(alignedCoords);
      const distance = distances[ix];
      return new TextureDescriptor(lod, alignedCoords, basisAtNormal, distance, planet.spatial.radius, planet.texturesCache.permutationTable);

    })
  }

  findNormal(planet:Planet, planetRotation: THREE.Quaternion, globalPosition: THREE.Vector3):THREE.Vector3 {
    const cameraPosition = globalPosition.clone();
    const planetCenter = new THREE.Vector3(...planet.spatial.position).sub(cameraPosition);
    planetCenter.normalize().negate();
    const inversePlanetRotation = planetRotation.clone().inverse();
    planetCenter.applyQuaternion(inversePlanetRotation);
    return planetCenter;
  }

  getMaxLodDistance(planetRadius, fovFactor: number): number {
    return planetRadius * 2. / fovFactor;
  }

  getDistanceToSurface(planet:Planet, globalPosition:THREE.Vector3): number {
    const distanceToCenter = this.getDistanceToCenterOfPlanet(planet, globalPosition);
    return distanceToCenter - planet.spatial.radius;

  }

  findLowestLod(planet:Planet, globalPosition:THREE.Vector3, pixelFovRatio:number):number {
    const maxLodDistance = this.getMaxLodDistance(planet.spatial.radius, pixelFovRatio);
    const distanceToNearestSurfacePoint = this.getDistanceToSurface(planet, globalPosition);
    const normalizedDistance = clamp(distanceToNearestSurfacePoint / maxLodDistance, 1e-6, 1.0);
    const heightBasedLOD = MaxLod - Math.max(0.0, Math.log2(normalizedDistance * MaxLodCoefficient));
    return Math.floor(heightBasedLOD);
  }

  getDistanceToCenterOfPlanet(planet: Planet, globalPosition: THREE.Vector3):number {
    const planetCenter = new THREE.Vector3(...planet.spatial.position);
    return planetCenter.distanceTo(globalPosition);
  }
}

function alignToNet(cc: CubeCoords, grid: number): CubeCoords {
  let uv = cc.st.clone().add(new THREE.Vector2(1, 1)).multiplyScalar(0.5).multiplyScalar(grid - 1);


  uv.x = Math.round(uv.x);
  uv.y = Math.round(uv.y);
  const st = uv.clone().multiplyScalar(1/(grid-1)).multiplyScalar(2.0).add(new THREE.Vector2(-1, -1));

  return new CubeCoords(st, cc.face);
}


function multiplyVec2(v: THREE.Vector2, s: number):THREE.Vector2 {
  return v.clone().multiplyScalar(s);
}

function clamp(v: number, m: number, M: number):number {
   return Math.min(M, Math.max(v,m))
}


