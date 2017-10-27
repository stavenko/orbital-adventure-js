import * as THREE from 'three';
const ShaderChunk = THREE.ShaderChunk;
const ShaderMaterial = THREE.ShaderMaterial;
const EventDispatcher = THREE.EventDispatcher;

ShaderChunk.lodUtils = require('../shaders/lod/lodUtils.glsl');

export function LodCalculatorMaterial(props) {
  ShaderMaterial.call(this);
  this.type = 'LodCalculatorMaterial';
  this.vertexShader = require('../shaders/lod/lodDeterminerVertex.glsl');
  this.fragmentShader = require('../shaders/lod/tileRetrievier.glsl');
  this.uniforms = {}; 
  this.transparent = false;
  this.needsUpdate = true;

}
Object.assign(LodCalculatorMaterial.prototype, EventDispatcher.prototype);

export function LODMaterial() {
  ShaderMaterial.call(this);
  this.type = 'LODMaterial';
  this.vertexShader = require('../shaders/lod/super/superTextureVertexShader.glsl');
  this.fragmentShader = require('../shaders/lod/super/superTextureFragmentShader.glsl');
  this.uniforms = {}; 
  this.transparent = true;
  this.needsUpdate = true;

  this.onBeforeCompile = () => {
    console.log('on before compile');
  };
}

Object.assign(LODMaterial.prototype, EventDispatcher.prototype);

export function CubeMapMaterial(props) {
  ShaderMaterial.call(this);
  this.type = 'CubeMapMaterial';
  this.vertexShader = require('../shaders/CubemapVertexShader.glsl');
  this.fragmentShader = require('../shaders/CubemapFragmentShader.glsl');
  this.uniforms = {}; 
  this.transparent = true;
  for (const u in props.staticUniforms) {
    this.uniforms[u] = {value: props.staticUniforms[u]};
  }
  this.needsUpdate = true;
}
Object.assign(CubeMapMaterial.prototype, EventDispatcher.prototype);

