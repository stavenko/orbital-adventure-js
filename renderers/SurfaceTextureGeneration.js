import get from 'lodash/get';
import * as THREE from 'three/src/constants';
import {Mesh} from 'three/src/objects/Mesh';
import {BufferAttribute} from 'three/src/core/BufferAttribute';
import {DataTexture} from 'three/src/textures/DataTexture';
import {Vector2} from 'three/src/math/Vector2';
import {BufferGeometry} from 'three/src/core/BufferGeometry';
import {RawShaderMaterial} from 'three/src/materials/RawShaderMaterial';
import {WebGLRenderTarget} from "three/src/renderers/WebGLRenderTarget.js";
import {PerspectiveCamera} from 'three/src/cameras/PerspectiveCamera';
import {ShaderChunk} from "three/src/renderers/shaders/ShaderChunk.js"
ShaderChunk.getPerlinValue = require('../shaders/heightUtils/perlin3d.glsl');
ShaderChunk.getHeightValue = require('../shaders/heightUtils/getHeightValue.glsl');
ShaderChunk.calculateNormal = require('../shaders/heightUtils/calculateNormal.glsl');
ShaderChunk.quaternion = require('../shaders/lod/quaternion.glsl');

const VertexShader = require('../shaders/ScreenSpaceVertexShader.glsl')
const normalMapShader = require('../shaders/normalMapShader.glsl')
const heightMapShader = require('../shaders/heightMapShader.glsl')

export class SurfaceTextureGenerator{

  constructor(renderer){
    this.renderer = renderer;
    this.textures = {}
    this.heightMapPool = 
    this.normalMapPool = [];
    this.notUsedCamera = new PerspectiveCamera;
    this.initScreenSpaceMesh();
    this.normalMapMaterial = new RawShaderMaterial({
      uniforms: { },
      vertexShader: VertexShader,
      fragmentShader: heightMapShader,
      transparent: false

    });
    
    this.normalMapMaterial.needsUpdate = true;
  }
  isExists(forWorld, type, params){

    let {lod, face, tile} = params;
    let desc = `${lod}-${face}-${tile}`;
    let key = `${forWorld.uuid}.${type}.${desc}`;
    let fb = get(this.textures, key);
    let isExists = !!fb && fb.key == key;
    return isExists;
  }

  createPermutationTable(forWorld){
    let f = new Float32Array(512 * 4);
    for(let i =0; i < 512; ++i){
      let ix = i & 255;
      f[i*3] = forWorld.table[ix];
      f[i*3+1] = forWorld.table[ix];
      f[i*3+2] = forWorld.table[ix];
      f[i*3+3] = 1.0;
    }
    return new DataTexture(f, 32, 16, THREE.RGBAFormat, THREE.FloatType);
  }

  lookupTextures(forWorld, type, params){
    let {lod, face, tile} = params;
    let desc = `${lod}-${face}-${tile}`;
    let framebuffer = this.textures[forWorld.uuid][type][desc];
    let timestamp = Date.now();
    framebuffer.accessTime = timestamp;
    return framebuffer.texture;
  }

  createFramebuffer(type){
    if(type == 'height'){
      return new WebGLRenderTarget(512, 512, {
        type: THREE.FloatType,
        format: THREE.RBGAFormat,
        depthBuffer: false,
        stencilBuffer: false,
      })
    }
    if(type == 'normal'){
      return new WebGLRenderTarget(512, 512, {
        type: THREE.FloatType,
        format: THREE.RBGAFormat,
        depthBuffer: false,
        stencilBuffer: false,
      })
    }
  }
  getPool(type){
    if(type == 'height') return this.heightMapPool;
    if(type == 'normal') return this.normalMapPool;
  }

  getFramebuffer(type, params){
    let pool = this.getPool(type, params);
    let foundFB = null;
    let currentTime = Date.now();
    for(let i = 0; i < pool.length; ++i){
      if((currentTime - pool[i].accessTime) > this.MaxAccessTime){
        foundFB = pool[i];
      }
    }
    if(!foundFB){
      let _t = Date.now();
      foundFB = this.createFramebuffer(type, params);
      pool.push(foundFB);
      console.log("Time for framebuffer generation", Date.now() - _t);
    }
    return foundFB;
  }
  
  initScreenSpaceMesh(){
    let geom = new BufferGeometry();
    let vtx = new Float32Array([
      -1, -1,
      1, -1,
      1, 1,
      -1, 1
    ]);
    let ind = new Uint16Array([0,1,2,0,2,3]);
    geom.addAttribute("sspoint", new BufferAttribute(vtx, 2, false));
    geom.setIndex(new BufferAttribute(ind, 1));
    let mesh = new Mesh(geom);
    mesh.frustumCulled = false;
    this._nonUsedCamera = new PerspectiveCamera;

    this.screenSpaceMesh = mesh;
  }

  saveTexture(fb, forWorld, type, params){
    let {lod, face, tile} = params;
    let desc = `${lod}-${face}-${tile}`;
    let key = `${forWorld.uuid}.${type}.${desc}`;
    if(!this.textures[forWorld.uuid])
      this.textures[forWorld.uuid] = {};

    if(!this.textures[forWorld.uuid][type])
      this.textures[forWorld.uuid][type] = {};
      
    this.textures[forWorld.uuid][type][desc] = fb;
    fb.key = key;
  }

  generateTexture(forWorld, type, params){
    let target = this.getFramebuffer(type, params);
    setTimeout(()=>{
      this.setupMaterialAndUniforms(forWorld, type, params);
      let _t = Date.now();
      this.renderer.render(this.screenSpaceMesh, this.notUsedCamera, target);
      console.log("Time for texture generation", Date.now() - _t);
    }, 0)
    this.saveTexture(target, forWorld, type, params);
  }

  setupHeightMapUniforms(forWorld, params){
    this.screenSpaceMesh.material = this.normalMapMaterial;
    if(!forWorld.texturesCache.permutationTable){
      forWorld.texturesCache.permutationTable = this.createPermutationTable(forWorld);
      forWorld.texturesCache.permutationTable.needsUpdate = true;
    }
    let uniforms = this.screenSpaceMesh.material.uniforms;
    uniforms.lod = {value: params.lod};
    uniforms.tile = {value: params.tile};
    uniforms.face = {value: params.face};
    console.log("prep", params.lod, params.face, params.tile);
    uniforms.permutationTable = {value: forWorld.texturesCache.permutationTable};
    uniforms.permutationTableSize = {value: new Vector2(32,16)}
  }

  setupNormalMapUniforms(forWorld, params){}

  setupMaterialAndUniforms(forWorld, type, params){
    if(type == 'height')
      return this.setupHeightMapUniforms(forWorld, params);
    if(type == 'normal')
      return this.setupNormalMapUniforms(forWorld, params); 
  }

  getTexture(forWorld, type, params){
    if(this.isExists(forWorld, type, params)) {
      return this.lookupTextures(forWorld, type, params);
    }else{
      this.generateTexture(forWorld, type, params);
      return this.lookupTextures(forWorld, type, params);
    }
  }

}
