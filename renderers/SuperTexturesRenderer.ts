import * as THREE from "three";
import {normal2Cube, CubeCoords} from '../math/cubeMap';

import VertexShader from '../shaders/ScreenSpaceVertexShader.glsl';
import heightMapShader from '../shaders/heightMapShader.glsl';

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

class TextureDescriptor{
  constructor(lod:number, coords: CubeCoords, horizonDistance:number){
    this.lod = lod;
    this.coords = coords;
    this.textureSize = horizonDistance;
    this.hash = ['' , lod , '-' , coords.st.x ,'x' , coords.st.y , ': ' , coords.face, horizonDistance].join('');
  }
  lod: number;
  coords: CubeCoords;
  textureSize: number
  hash: string;
}

interface SpatialProperties{
  radius:  number;
  position: [number, number, number];

}

interface Planet {
  spatial: SpatialProperties;
  
}


export class SuperTextureRenderer {
  readonly NormalTileSteps: number =  3;
  readonly Divisor: number =  this.NormalTileSteps - 1;
  readonly renderer: THREE.WebGLRenderer;
  readonly lodMap:  Map<number, THREE.WebGLRenderTarget>;
  readonly tdMap: Map<number, TextureDescriptor>;
  readonly screenSpaceMesh: THREE.Mesh;
  readonly screenSpaceScene: THREE.Scene;
  readonly __notUsedCamera: THREE.Camera;
  readonly heightMapMaterial: THREE.RawShaderMaterial;
 
  constructor(r: THREE.WebGLRenderer) {
    this.renderer = r;
    this.lodMap = new Map;
    this.tdMap = new Map;
    this.screenSpaceMesh = this.getScreenSpaceMesh();
    this.screenSpaceScene = new THREE.Scene;
    this.screenSpaceScene.add(this.screenSpaceMesh);
    this.heightMapMaterial = new THREE.RawShaderMaterial({
      uniforms: { },
      vertexShader: VertexShader,
      fragmentShader: heightMapShader,
      transparent: false
    });
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
    const mesh = new THREE.Mesh(geom);
    mesh.frustumCulled = false;
    return mesh;
  }

  getTexture(td: TextureDescriptor): THREE.Texture {
    if (this.tdMap.has(td.lod)) {
      const otd = this.tdMap.get(td.lod);
      if (otd.hash == td.hash) {
        return this.lodMap.get(td.lod).texture;
      }
    }
    this.prepareTexture(td);
    return this.lodMap.get(td.lod).texture;
  }

  prepareTexture(textureDescriptor: TextureDescriptor):void {
    if (!this.lodMap.has(textureDescriptor.lod)) {
      this.createFramebuffer(textureDescriptor.lod);
      this.tdMap.set(textureDescriptor.lod, textureDescriptor);
    }
    this.renderFramebuffer(textureDescriptor, this.lodMap.get(textureDescriptor.lod));
  }

  renderFramebuffer(td: TextureDescriptor, fb: THREE.WebGLRenderTarget): void {
    this.setupUniforms(td);
    this.renderer.render(this.screenSpaceScene, this.__notUsedCamera, fb);
  }

  setupUniforms(td: TextureDescriptor): void {
    const ufs = this.heightMapMaterial.uniforms;
    ufs.face = {value: td.coords.face};
    ufs.faceCoords = {value: td.coords.st};
    ufs.size = {value: td.textureSize};
  }

  createFramebuffer(lod: number): void {
    const fb = new THREE.WebGLRenderTarget(2048, 2048, {
      type: THREE.FloatType,
      format:THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false
    });
    this.lodMap.set(lod, fb);
  }

  getBaseTexture(sphereCoordsNormal:THREE.Vector3, lod:number, horizonDistance: number):TextureDescriptor {
    const coords:CubeCoords = normal2Cube(sphereCoordsNormal);
    const currentNormalSteps = this.NormalTileSteps * lod;
    const alignedCoords = alignToNet(coords, currentNormalSteps);
    const divider = Math.pow(3, Math.max(lod, this.Divisor));

    return new TextureDescriptor(lod, alignedCoords, horizonDistance / divider);
  }

  getTextureOfLod(bestLod:number, lodDiff:number, sphereCoordsNormal:THREE.Vector3, horizonDistance: number): Optional<TextureDescriptor> {
    const lod = bestLod - lodDiff;
    let divider: number= 0;
    if (lod < 0) {
      return Optional.none();
    }

    if (bestLod == 1) {
      divider = 1;
    }
    if (bestLod >= 2) {
      divider = Math.pow(3, this.Divisor - lodDiff);
    }

    const coords:CubeCoords = normal2Cube(sphereCoordsNormal);
    const currentNormalSteps = this.NormalTileSteps * lod;
    const alignedCoords = alignToNet(coords, currentNormalSteps);
    const t = new TextureDescriptor(lod, alignedCoords, horizonDistance / divider);
    return Optional.init(t);
  }

  getTexturesDescriptorAt(planet:Planet, globalPosition: THREE.Vector3, planetRotation: THREE.Quaternion, pixelFovRatio:number):Array<TextureDescriptor>{
    const result: Array<TextureDescriptor> = [];
    const lod = this.findLowestLod(planet, globalPosition, pixelFovRatio);
    const sphereCoordsNormal = this.findNormal(planet, planetRotation, globalPosition);
    const horizonDistance = Math.acos(planet.spatial.radius / this.getDistanceToCenterOfPlanet(planet, globalPosition)) * planet.spatial.radius;
    const base = this.getBaseTexture(sphereCoordsNormal, lod, horizonDistance);
    for(let i = 1; i < 3; ++i) {
      const res = this.getTextureOfLod(base.lod, i, sphereCoordsNormal, horizonDistance);
      if (res.hasValue) {
        result.push(res.get());
      }
    }
    return result;
  }

  findNormal(planet:Planet, planetRotation: THREE.Quaternion, globalPosition: THREE.Vector3):THREE.Vector3 {
    const cameraPosition = globalPosition.clone();
    const planetCenter = new THREE.Vector3(...planet.spatial.position).sub(cameraPosition);
    planetCenter.negate().normalize();
    const inversePlanetRotation = planetRotation.clone().inverse();
    planetCenter.applyQuaternion(planetRotation);
    return planetCenter;
  }

  findLowestLod(planet:Planet, globalPosition:THREE.Vector3, pixelFovRatio:number):number {
    const cameraPosition = globalPosition.clone();
    const planetCenter = new THREE.Vector3(...planet.spatial.position).sub(cameraPosition);
    const distanceToCenter = planetCenter.length();
    const maxLodDistance = planet.spatial.radius * 0.5 / pixelFovRatio;
    const distanceToNearestSurfacePoint = distanceToCenter - planet.spatial.radius;
    const normalizedDistance = clamp(distanceToNearestSurfacePoint / maxLodDistance, 1e-6, 1.0);
    const heightBasedLOD = 12.0 - Math.max(0.0, Math.log2(normalizedDistance * 4096.0));
    return heightBasedLOD;
  }

  getDistanceToCenterOfPlanet(planet: Planet, globalPosition: THREE.Vector3):number {
    const planetCenter = new THREE.Vector3(...planet.spatial.position);
    return planetCenter.distanceTo(globalPosition);
  }
}

function alignToNet(cc: CubeCoords, grid: number): CubeCoords {
  const st = multiplyVec2(cc.st, grid);
  st.x = Math.round(st.x);
  st.y = Math.round(st.y);
  return new CubeCoords(multiplyVec2(st, 1/grid), cc.face);
}


function multiplyVec2(v: THREE.Vector2, s: number):THREE.Vector2 {
  return v.clone().multiplyScalar(s);
}

function clamp(v: number, m: number, M: number):number {
   return Math.min(M, Math.max(v,m))
}


