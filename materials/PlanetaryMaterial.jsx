import {EventDispatcher} from 'three/src/core/EventDispatcher';
import {ShaderMaterial} from 'three/src/materials/ShaderMaterial';
import {RawShaderMaterial} from 'three/src/materials/RawShaderMaterial';

export function LODMaterial(props){
  ShaderMaterial.call(this);
  this.type='LODMaterial';
  this.vertexShader = require('../shaders/LODPlanetVertexShader.glsl');
  this.fragmentShader = require('../shaders/LODPlanetFragmentShader.glsl');
  this.uniforms = {}; 
  this.transparent = true;
  // for(let u in props.staticUniforms){
  // this.uniforms[u] = {value:props.staticUniforms[u]};
  // }
  this.needsUpdate = true;

}
Object.assign(LODMaterial.prototype, EventDispatcher.prototype);

export function CubeMapMaterial(props){
  ShaderMaterial.call(this);
  this.type='CubeMapMaterial';
  this.vertexShader = require('../shaders/CubemapVertexShader.glsl');
  this.fragmentShader = require('../shaders/CubemapFragmentShader.glsl');
  this.uniforms = {}; 
  this.transparent = true;
  for(let u in props.staticUniforms){
    this.uniforms[u] = {value:props.staticUniforms[u]};
  }
  this.needsUpdate = true;
}
Object.assign(CubeMapMaterial.prototype, EventDispatcher.prototype);

