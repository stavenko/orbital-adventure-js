import {
  kilometer,
  XYZ_TO_SRGB,
  CIE_2_DEG_COLOR_MATCHING_FUNCTIONS,
  MAX_LUMINOUS_EFFICACY,
  minLambda, maxLambda,
  lambdaR, lambdaG, lambdaB

} from './AtmosphereConstants.js';
import {BufferAttribute} from 'three/src/core/BufferAttribute';
import {BufferGeometry} from 'three/src/core/BufferGeometry';
import {Mesh} from 'three/src/objects/Mesh';
import {Matrix4} from 'three/src/math/Matrix4';
import {Vector4} from 'three/src/math/Vector4';
import {Vector3} from 'three/src/math/Vector3';
import {Vector2} from 'three/src/math/Vector2';
import {PerspectiveCamera} from 'three/src/cameras/PerspectiveCamera';
import {Color} from 'three/src/math/Color';
import * as THREE from 'three/src/constants';
import {RawShaderMaterial} from 'three/src/materials/RawShaderMaterial';
import {WebGLRenderTarget} from "three/src/renderers/WebGLRenderTarget.js";
import {ShaderChunk} from "three/src/renderers/shaders/ShaderChunk.js"
ShaderChunk.AtmosphereConstructor = require('../shaders/AtmosphereConstructor.glsl')
ShaderChunk.AtmosphereUniforms = require('../shaders/AtmosphereUniforms.glsl');
ShaderChunk.AtmosphereFunctions = require('../shaders/atmosphereFunctions.glsl');
ShaderChunk.textureDimensionsSetup = require('../shaders/textureDimensionsSetup.glsl');

const pow = Math.pow;

const LerpIncrements4 = [
  new Int32Array([0,0,0,0]),
  new Int32Array([0,0,0,1]),
  new Int32Array([0,0,1,0]),
  new Int32Array([0,0,1,1]),
  new Int32Array([0,1,0,0]),
  new Int32Array([0,1,0,1]),
  new Int32Array([0,1,1,0]),
  new Int32Array([0,1,1,1]),
  new Int32Array([1,0,0,0]),
  new Int32Array([1,0,0,1]),
  new Int32Array([1,0,1,0]),
  new Int32Array([1,0,1,1]),
  new Int32Array([1,1,0,0]),
  new Int32Array([1,1,0,1]),
  new Int32Array([1,1,1,0]),
  new Int32Array([1,1,1,1]),
].map(x => new Vector4(...x));

function getIrradianceResolution(planetProps){
  let {resMus, resR} = planetProps;
  return [resMus*2, resR/2];
}

function getTransmittanceResolution(planetProps){
  let {resMu, resR} = planetProps;
  return [resMu*2, resR*2];

}
const VertexShader = require('../shaders/ScreenSpaceVertexShader.glsl')

export class AtmosphereTexturesRenderer{

  constructor(threeRenderer){
    this.renderer = threeRenderer;
    this.prepareShaders();
    this.initScreenSpaceMesh();
    this.textures = {};
    threeRenderer.context.canvas.addEventListener('webglcontextlost',event=>{
      console.log("context lost");
      event.preventDefault();
    })

    threeRenderer.context.canvas.addEventListener('webglcontextrestored',event=>{
      console.log("context restored");
      event.preventDefault();
    })

    let atmosphere = require('../shaders/atmosphereShader.glsl');

    this.atmosphereMaterial = new RawShaderMaterial({
      uniforms: {
        viewInverse: {value: new Matrix4},
        projectionMatrix: {value: new Matrix4},
        projectionInverse: {value: new Matrix4},
        planetPosition: {value: new Vector3},
        resolution: {value: new Vector2},
        ttimeVar: {value: Math.PI/2, type:'f'},
        radius: {value: 0, type:'f'},
        atmosphereHeight: {value: 100, type:'f'},
      },
      vertexShader: VertexShader,
      fragmentShader: atmosphere,
      transparent: true

    });
    
    this.atmosphereMaterial.extensions.derivatives = true;
    this.atmosphereMaterial.needsUpdate = true;
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

  prepareShaders(){
    this.shaders = {
      transmittanceTexture:new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/TransmittanceShader.glsl'),
        transparent: false
      }),

      irradianceTexture1:new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/IrradianceShader1.glsl'),
        transparent: false
      }),

      irradianceTexture2:new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/IrradianceShader2.glsl'),
        transparent: false
      }),

      irradianceTexture3:new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/IrradianceShader3.glsl'),
        transparent: false
      }),

      irradianceTexture:new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/IrradianceShader4.glsl'),
        transparent: false
      }),

      deltaIrradianceTexture1 :new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaIrradianceShader1.glsl'),
        transparent: false
      }),
      deltaIrradianceTexture2 :new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaIrradianceShader2.glsl'),
        transparent: false
      }),

      deltaIrradianceTexture3 :new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaIrradianceShader3.glsl'),
        transparent: false
      }),

      deltaIrradianceTexture4 :new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaIrradianceShader4.glsl'),
        transparent: false
      }),

      scatteringDensityTexture2: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/ScatteringDensityShader2.glsl'),
      }),

      scatteringDensityTexture3: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/ScatteringDensityShader3.glsl'),
      }),

      scatteringDensityTexture4: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/ScatteringDensityShader4.glsl'),
      }),
      scatteringTexture1: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/ScatteringShader1.glsl'),
      }),

      scatteringTexture2: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/ScatteringShader2.glsl'),
      }),
      scatteringTexture3: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/ScatteringShader3.glsl'),
      }),
      scatteringTexture: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/ScatteringShader4.glsl'),
      }),

      singleMieScatteringTexture: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/SingleMieScatteringShader.glsl'),
      }),

      deltaMultipleScatteringTexture: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/DeltaMultipleScatteringShader4.glsl'),
      }),

      deltaMultipleScatteringTexture3: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/DeltaMultipleScatteringShader3.glsl'),
      }),

      deltaMultipleScatteringTexture2: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/DeltaMultipleScatteringShader2.glsl'),
      }),

      deltaMultipleScatteringTexture1: new RawShaderMaterial({
        vertexShader: VertexShader,
        transparent: false,
        fragmentShader: require('../shaders/atm/DeltaMultipleScatteringShader1.glsl'),
      })
    }
  }

  renderTarget(atmosphere, target, name){

    let material = this.shaders[name];
    if(!material) throw new Error('cant find shader for: ' + name);

    if(target.dependencies)
      for(let k = 0; k <target.dependencies.length; ++k){
        let dep = target.dependencies[k];
        let texture = this.getTexture(dep, atmosphere);
        material.uniforms[dep] = {value: texture};
      }
    this.setupAtmosphereUniforms(material, atmosphere);
    this.screenSpaceMesh.material = material;

    console.log(">>>", name);
    let gl = this.renderer.context;
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    this.renderer.render(this.screenSpaceMesh, this._nonUsedCamera, target);
    debugger;

    

  }

  renderAtmospehereTexture(atmosphere, name){
    let {planetUUID} = atmosphere;
    if(!this.textures[planetUUID]){
      this.textures[planetUUID] = {};
    }
    if(!this.textures[planetUUID][name]){
      let format = this.getTextureProps(name, atmosphere)
      this.textures[planetUUID][name] 
        = new WebGLRenderTarget(format.width, format.height, format);
      if(format.dependencies) 
        this.textures[planetUUID][name].dependencies = format.dependencies;
    }
    let target = this.textures[planetUUID][name];
    this.renderTarget(atmosphere, target, name);
  }

  getTextureProps(name, atmosphere){
    let type = THREE.FloatType, 
        format = THREE.RGBAFormat, 
        minFilter = THREE.NearestFilter,
        magFilter = THREE.NearestFilter,
        depthBuffer=false, 
        stencilBuffer = false,
        unpackAlignment = 1,
        generateMipMaps = false;
    let {resMu, resNu, resR, resMus} = atmosphere;
    let sz = resNu * resMu * resMus * resR;
    let [width,height] = this.dimensions2d(atmosphere);
    switch(name){
      case 'scatteringDensityTexture2':{
        return{
          type, format,
          width, height,
          unpackAlignment, generateMipMaps,
          depthBuffer, stencilBuffer,
          shader: name,
          minFilter, magFilter,
          dependencies:[
            'transmittanceTexture', 
            'singleMieScatteringTexture',
            'deltaMultipleScatteringTexture1',
            'deltaIrradianceTexture1'
          ]
        }
      }

      case 'scatteringDensityTexture3':{
        return{
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipMaps,
          shader: name,
          minFilter, magFilter,
          dependencies:[
            'transmittanceTexture', 
            'singleMieScatteringTexture',
            'deltaMultipleScatteringTexture2',
            'deltaIrradianceTexture2',
          ]
        }
      }

      case 'scatteringDensityTexture4':{
        return{
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          minFilter, magFilter,
          unpackAlignment, generateMipMaps,
          shader: name,
          dependencies:[
            'transmittanceTexture', 
            'singleMieScatteringTexture',
            'deltaMultipleScatteringTexture3',
            'deltaIrradianceTexture3',
          ]
        }
      }
      case 'scatteringTexture1':{
        return{
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipMaps,
          shader: name,
          minFilter, magFilter,
          dependencies:['deltaMultipleScatteringTexture1', 'singleMieScatteringTexture']
        }
      }
      case 'scatteringTexture2':{
        return{
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          minFilter, magFilter,
          unpackAlignment, generateMipMaps,
          shader: name,
          dependencies:['deltaMultipleScatteringTexture2', 'scatteringTexture1']
        }
      }
      case 'scatteringTexture3':{
        return{
          type, format,
          width, height,
          unpackAlignment, generateMipMaps,
          depthBuffer, stencilBuffer,
          minFilter, magFilter,
          shader: name,
          dependencies:['deltaMultipleScatteringTexture3', 'scatteringTexture2']
        }
      }
      case 'scatteringTexture':{
        return{
          type, format,
          width, height,
          minFilter,
          magFilter,
          unpackAlignment, generateMipMaps,
          //minFilter:THREE.LinearFilter, 
          //magFilter: THREE.LinearFilter,
          depthBuffer, stencilBuffer,
          shader: name,
          dependencies:['deltaMultipleScatteringTexture', 'scatteringTexture3']
        }
      }

      case 'deltaMultipleScatteringTexture2':{
        return{
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          minFilter, magFilter,
          shader: name,
          unpackAlignment, generateMipMaps,
          dependencies:['transmittanceTexture', 'scatteringDensityTexture2']
        }
      }
      case 'deltaMultipleScatteringTexture3':{
        return {
          type, format,
          width, height,
          unpackAlignment, generateMipMaps,
          depthBuffer, stencilBuffer,
          minFilter, magFilter,
          shader: name,
          dependencies:['transmittanceTexture', 'scatteringDensityTexture3']
        }
      }

      case 'deltaMultipleScatteringTexture':{
        return{
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          shader: name,
          unpackAlignment, generateMipMaps,
          minFilter, magFilter,
          dependencies:['transmittanceTexture', 'scatteringDensityTexture4']
        }
      }
      case 'deltaMultipleScatteringTexture1':{
        return{
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          shader: name,
          minFilter, magFilter,
          unpackAlignment, generateMipMaps,
          dependencies:['transmittanceTexture']
        }
      }

      case 'irradianceTexture1':{
        let res = getIrradianceResolution(atmosphere);
        return{
          width: res[0],
          height: res[1],
          minFilter, magFilter,
          type, format, depthBuffer, stencilBuffer,
          unpackAlignment, generateMipMaps,
        }
      }
      case 'irradianceTexture2':{
        let res = getIrradianceResolution(atmosphere);
        return{
          width: res[0],
          height: res[1],
          minFilter, magFilter,
          unpackAlignment, generateMipMaps,
          type, format, depthBuffer, stencilBuffer,
          dependencies: ['deltaIrradianceTexture2']
        }
      }
      case 'irradianceTexture3':{
        let res = getIrradianceResolution(atmosphere);
        return{
          width: res[0],
          height: res[1],
          minFilter, magFilter,
          type, format, depthBuffer, stencilBuffer,
          unpackAlignment, generateMipMaps,
          dependencies: ['deltaIrradianceTexture3', 'irradianceTexture2']
        }
      }
      case 'irradianceTexture':{
        let res = getIrradianceResolution(atmosphere);
        return{
          width: res[0],
          height: res[1],
          minFilter, magFilter,
          unpackAlignment, generateMipMaps,
          type, format, depthBuffer, stencilBuffer,
          dependencies: ['deltaIrradianceTexture4', 'irradianceTexture3']
        }
      }
      
      case 'deltaIrradianceTexture1':{
        let res = getIrradianceResolution(atmosphere);
        return{
          width: res[0],
          height: res[1],
          minFilter, magFilter,
          type, format, depthBuffer, stencilBuffer,
          unpackAlignment, generateMipMaps,
          dependencies: ['transmittanceTexture'] 
        }
      }
      case 'deltaIrradianceTexture2':{
        let res = getIrradianceResolution(atmosphere);
        return{
          width: res[0],
          height: res[1],
          unpackAlignment, generateMipMaps,
          minFilter, magFilter,
          type, format, depthBuffer, stencilBuffer,
          dependencies: ['singleMieScatteringTexture', 'deltaMultipleScatteringTexture2' ]
        }
      }
      case 'deltaIrradianceTexture3':{
        let res = getIrradianceResolution(atmosphere);
        return{
          width: res[0],
          height: res[1],
          minFilter, magFilter,
          unpackAlignment, generateMipMaps,
          type, format, depthBuffer, stencilBuffer,
          dependencies: ['singleMieScatteringTexture', 'deltaMultipleScatteringTexture3' ]
        }
      }
      case 'deltaIrradianceTexture4':{
        let res = getIrradianceResolution(atmosphere);
        return{
          width: res[0],
          height: res[1],
          unpackAlignment, generateMipMaps,
          minFilter, magFilter,
          type, format, depthBuffer, stencilBuffer,
          dependencies: ['singleMieScatteringTexture', 'deltaMultipleScatteringTexture' ]
        }
      }

      case 'singleMieScatteringTexture':{
        return {
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipMaps,
          shader: name,
          minFilter, magFilter,
          dependencies:[
            'transmittanceTexture', 
          ]
        }
      }

      case 'transmittanceTexture':{
        let res = getTransmittanceResolution(atmosphere)
        return {
          width: res[0], 
          height: res[1], 
          type, format,
          minFilter, magFilter,
          unpackAlignment, generateMipMaps,
          depthBuffer:false,
          stencilBuffer:false,
          shader: name
        }

      }
      default:
        throw new Error("cant get props for texture" + name );
    }
  }

  getTexture(name, atmosphere){
    let planetUUID = atmosphere.planetUUID;
    if(!this.textures[planetUUID] )
      this.renderAtmospehereTexture(atmosphere, name);
    if(!this.textures[planetUUID][name])
      this.renderAtmospehereTexture(atmosphere, name);
    return this.textures[planetUUID][name].texture;
  }

  dimensions2d({resMu, resNu, resR, resMus}){
    let W = resMus * resNu;
    let H = resR * resMu;
    return [W, H];
  }

  setupAtmosphereUniforms(material, atmosphere){

    material.uniforms.solarIrradiance = {value: new Vector3(...atmosphere.solarIrradiance)};
    material.uniforms.sunAngularRadius = {value: atmosphere.sunAngularRadius};
    material.uniforms.bottomRadius= {value:atmosphere.bottomRadius};
    material.uniforms.topRadius = {value:atmosphere.topRadius};
    material.uniforms.rayleighDensity = {value: packProfile(atmosphere.rayleighDensity)};
    material.uniforms.rayleighScattering = {value:new Vector3(...atmosphere.rayleighScattering)};
    material.uniforms.mieDensity ={value: packProfile(atmosphere.mieDensity)};
    material.uniforms.mieScattering = {value: new Vector3(...atmosphere.mieScattering)};
    material.uniforms.mieExtinction = {value: new Vector3(...atmosphere.mieExtinction)};
    material.uniforms.miePhaseFunctionG = {value:atmosphere.miePhaseFunctionG};
    material.uniforms.absorptionDensity={value: packProfile(atmosphere.absorptionDensity)};
    material.uniforms.absorptionExtinction = {value:atmosphere.absorptionExtinction};
    material.uniforms.groundAlbedo = {value: new Vector3(... atmosphere.groundAlbedo) };
    material.uniforms.muSMin = {value:atmosphere.muSMin};
    material.uniforms.LinearInterpolators= {value:LerpIncrements4}

    const {resMu, resNu, resMus, resR} = atmosphere;
    let [w,h] = this.dimensions2d(atmosphere);
    material.uniforms.resolutionOf4d ={
      value: new Vector2(w,h)
    }

    material.uniforms.sunDirection ={
      value: new Vector3(0,1,0)
    }

    material.uniforms._additional = {
      value: new Vector2((this.__zz%resNu)/resNu, (this.__ww%resMu)/resMu)
    }
    material.uniforms.atmosphereTableResolution = {value:
      new Vector4(resMus, resNu, resMu, resR)
    }
    material.uniforms.sun_size = {value:
      new Vector2(Math.tan(atmosphere.sunAngularRadius), Math.cos(atmosphere.sunAngularRadius))
    }
    material.uniforms.SkySpectralRadianceToLuminance = {
      value: new Vector3(...atmosphere.SkySpectralRadianceToLuminance)
    }
    material.uniforms.SunSpectralRadianceToLuminance = {
      value: new Vector3(...atmosphere.SunSpectralRadianceToLuminance)
    }
    material.uniforms.sun_radiance = {value:
      new Vector3(
        atmosphere.solarIrradiance[0]/ atmosphere.sunSolidAngle,
        atmosphere.solarIrradiance[1]/ atmosphere.sunSolidAngle,
        atmosphere.solarIrradiance[2]/ atmosphere.sunSolidAngle)
    }

    material.uniforms.white_point = {value:
      new Vector3( 1, 1, 1)
    }
    /*
    for(let k in texturesMap){
      this.atmosphereMaterial.uniforms[k] = {value: texturesMap[k]}
    }
   */

    function packProfile(prof){
      let layer1 = prof[0];
      let layer2 = prof[1];
      let arr = new Float32Array(10);
      arr[0] = layer1.width;
      arr[1] = layer1.exp_term;
      arr[2] = layer1.exp_scale;
      arr[3] = layer1.linear_term;
      arr[4] = layer1.constant_term;

      arr[5] = layer2.width;
      arr[6] = layer2.exp_term;
      arr[7] = layer2.exp_scale;
      arr[8] = layer2.linear_term;
      arr[9] = layer2.constant_term;
      return arr;
    }
  }

  getAtmosphereMaterial(planet, star, {planetPosition, camera}){
    let param = Date.now()%10000;
    let material = this.atmosphereMaterial;
    let atmosphere = this.getAtmosphere(planet, star);
    this.setupAtmosphereUniforms(material, atmosphere);

    let width = this.renderer.domElement.width;
    let height = this.renderer.domElement.height;
    let viewMatrix = new Matrix4().getInverse(camera.matrixWorld);
    let viewInverseMatrix = camera.matrixWorld.clone();
    let projectionInverse = new Matrix4().getInverse(camera.projectionMatrix);

    let textures = [
      'singleMieScatteringTexture',
      'deltaMultipleScatteringTexture1',
      'scatteringDensityTexture2',
      'transmittanceTexture', 
      'scatteringTexture',
      'irradianceTexture',
      'irradianceTexture2',
      'irradianceTexture3',
      'deltaIrradianceTexture1',
      'deltaIrradianceTexture2',
      'deltaIrradianceTexture3',
      'deltaIrradianceTexture4',
    ];

    material.uniforms.exposure = {value: 10 }
    for(let i =0 ;i < textures.length; ++i) {
      let tn = textures[i];
      let t = this.getTexture(tn, atmosphere);
      material.uniforms[tn] = {value: t};
    }

    let pp = planetPosition.clone();
    pp.multiplyScalar(1/1000);

    material.uniforms.resolution =  {value: new Vector2(width, height)};
    material.uniforms.ttimeVar= {value: param/1000};
    material.uniforms.planetPosition= {value: pp};
    material.uniforms.radius= {value: planet.spatial.radius};

    material.uniforms.viewMatrix= {value: viewMatrix};
    material.uniforms.viewInverseMatrix= {value: camera.matrixWorld.clone()};
    material.uniforms.projectionInverse= {value: projectionInverse};
    return material;
  }

  spectralRadianceToLuminanceFactors(wavelengths, solarIrradiance, power){
    let k_r = 0.0, k_g = 0.0, k_b = 0.0;

    let solar_r = this.interpolate(wavelengths, solarIrradiance, lambdaR);
    let solar_g = this.interpolate(wavelengths, solarIrradiance, lambdaG);
    let solar_b = this.interpolate(wavelengths, solarIrradiance, lambdaB);
    let dlambda = 1;
    for (let lambda = minLambda; lambda < maxLambda; lambda += dlambda) {
      let x_bar = this.CieColorMatchingFunctionTableValue(lambda, 1);
      let y_bar = this.CieColorMatchingFunctionTableValue(lambda, 2);
      let z_bar = this.CieColorMatchingFunctionTableValue(lambda, 3);

      const xyz2srgb = XYZ_TO_SRGB;
      let r_bar = xyz2srgb[0] * x_bar + xyz2srgb[1] * y_bar + xyz2srgb[2] * z_bar;
      let g_bar = xyz2srgb[3] * x_bar + xyz2srgb[4] * y_bar + xyz2srgb[5] * z_bar;
      let b_bar = xyz2srgb[6] * x_bar + xyz2srgb[7] * y_bar + xyz2srgb[8] * z_bar;
      let irradiance = this.interpolate(wavelengths, solarIrradiance, lambda);
      k_r += r_bar * irradiance / solar_r *
          pow(lambda / lambdaR, power);
      k_g += g_bar * irradiance / solar_g *
          pow(lambda / lambdaG, power);
      k_b += b_bar * irradiance / solar_b *
          pow(lambda / lambdaB, power);
    }
    k_r *= MAX_LUMINOUS_EFFICACY * dlambda;
    k_g *= MAX_LUMINOUS_EFFICACY * dlambda;
    k_b *= MAX_LUMINOUS_EFFICACY * dlambda;
    return [k_r, k_g, k_b];

  }
  defaultDensityProfileLayer(){
    return {
      width:0,
      exp_term: 0,
      exp_scale:0,
      linear_term: 0,
      constant_term: 0
    }
  }
  serializeDensityProfile(layers){
    const kLayerCount = 2;
    while (layers.length < kLayerCount) {
      layers.unshift(this.defaultDensityProfileLayer());
    }
    let result = [];
    layers.forEach(layer=>{
      let nl = {...layer};
      nl.width /= kilometer;
      nl.exp_scale *= kilometer;
      nl.linear_term *= kilometer;
      result.push(nl);
    })
    return result;
  };

  prepareSpecter(planetProps, star) {
    let {
      mieAngstromAlpha,
      mieAngstromBeta,
      mieScaleHeight,
      has_ozone,
      rayleigh,
      mieSingleScatteringAlbedo,
      maxOzoneNumberDensity,
      ozoneCrossSection,
    } = planetProps.phisical;
    let wavelengths = [];
    let solarIrradiance = [];
    let rayleighScattering = [];
    let mieScattering = [];
    let mieExtinction = [];
    let absorptionExtinction = [];
    let groundAlbedo = [];
    for(let l = minLambda; l <= maxLambda; l+=10){
      let spectreIx =  (l - minLambda) / 10
      let lambda = l * 1e-3;
      let mie = mieAngstromBeta / mieScaleHeight * pow(lambda, -mieAngstromAlpha);
      wavelengths.push(l);
      solarIrradiance.push(star.irradiance[spectreIx]);
      rayleighScattering.push(rayleigh * pow(lambda, -4));
      mieScattering.push(mie * mieSingleScatteringAlbedo);
      mieExtinction.push(mie);
      absorptionExtinction.push(has_ozone ?
          maxOzoneNumberDensity * ozoneCrossSection[spectreIx] :
          0.0);
      groundAlbedo.push(planetProps.phisical.groundAlbedo);
    }
    let length = wavelengths.length;
    let spectresInitial = {
      wavelengths, solarIrradiance, rayleighScattering,
      mieScattering, mieExtinction, absorptionExtinction,
      groundAlbedo
    };
    let retSpectres = {};
    for(let k in spectresInitial){
      retSpectres[k] = new Float64Array(spectresInitial[k]);
    }
    return retSpectres;
  }

  interpolate(wavelengths, waveLengthFunction, wavelength){
    if(wavelengths.length != waveLengthFunction.length) throw "incorrect data";
    if(wavelength < wavelengths[0]) return waveLengthFunction[0];
    for(let i =0; i<wavelengths.length; ++i){
      if(wavelength < wavelengths[i+1]){
      let u = (wavelength - wavelengths[i]) / (wavelengths[i + 1] - wavelengths[i]);
      let result =
          waveLengthFunction[i] * (1.0 - u) + waveLengthFunction[i + 1] * u;
      if(isNaN(result))
        throw 'interpolation result is nan';
      return result;

      }
    }
  }

  spectreToRGB(wavelength, array, scale = 1.0){
    let r = this.interpolate(wavelength, array, lambdaR) * scale;
    let g = this.interpolate(wavelength, array, lambdaG) * scale;
    let b = this.interpolate(wavelength, array, lambdaB) * scale;
    if(isNaN(r) || isNaN(b) || isNaN(g))
      throw 'results are NaN';
    return [r,g,b];
  }

  CieColorMatchingFunctionTableValue(wavelength, column){
    if (wavelength <= minLambda || wavelength >= minLambda) {
      return 0.0;
    }
    let u = (wavelength - minLambda) / 5.0;
    let row = Math.floor(u);
    if(!(row >= 0 && row + 1 < 95)) throw "incorrect row";
    if(!(CIE_2_DEG_COLOR_MATCHING_FUNCTIONS[4 * row] <= wavelength &&
           CIE_2_DEG_COLOR_MATCHING_FUNCTIONS[4 * (row + 1)] >= wavelength)){
      throw "incorrect wavelength";
    }
    u -= row;
    return CIE_2_DEG_COLOR_MATCHING_FUNCTIONS[4 * row + column] * (1.0 - u) +
        CIE_2_DEG_COLOR_MATCHING_FUNCTIONS[4 * (row + 1) + column] * u;

  }
  getAtmosphere(planet, star){
    const resMu=128, resNu=8, resMus=32, resR=32;
    const spectre = this.prepareSpecter(planet, star);
    const {mieScaleHeight, rayleighScaleHeight} = planet.phisical;
    const {wavelengths} = spectre;
    let mieDensityLayer = {
      width: 0,
      exp_term: 1,
      exp_scale: -1 / mieScaleHeight,
      linear_term: 0,
      constant_term: 0,
    }
    let rayleighDensityLayer = {
      width: 0,
      exp_term: 1,
      exp_scale: -1 / rayleighScaleHeight,
      linear_term: 0,
      constant_term: 0,
    }
    let ozoneDensity = [];
    ozoneDensity.push({
      width: 25000,
      exp_term: 0,
      exp_scale: 0,
      linear_term: 1/15000,
      constant_term: -2/3,
    })
    ozoneDensity.push({
      width: 0,
      exp_term: 0,
      exp_scale: 0,
      linear_term: -1/15000,
      constant_term: 8/3,
    })
    let solarIrradiance = this.spectreToRGB(wavelengths, spectre.solarIrradiance)
    let rayleighScattering = this.spectreToRGB(wavelengths, spectre.rayleighScattering, kilometer)
    let mieScattering = this.spectreToRGB(wavelengths, spectre.mieScattering, kilometer)
    let mieExtinction = this.spectreToRGB(wavelengths, spectre.mieExtinction, kilometer)
    let absorptionExtinction = this.spectreToRGB(wavelengths, spectre.absorptionExtinction, kilometer)
    let groundAlbedo = this.spectreToRGB(wavelengths, spectre.groundAlbedo, 1.0)
    let skyK = this.spectralRadianceToLuminanceFactors(wavelengths, spectre.solarIrradiance, -3);
    let sunK = this.spectralRadianceToLuminanceFactors(wavelengths, spectre.solarIrradiance, 0);
    const muSMin = Math.cos(120 / 180 * Math.PI);

    const atmosphere = {
      resMu, resNu, resMus, resR,
      planetUUID: planet.uuid,
      muSMin,
      solarIrradiance,
      rayleighScattering,
      miePhaseFunctionG: 0.8,
      mieExtinction,
      mieScattering,
      absorptionExtinction,
      SkySpectralRadianceToLuminance: skyK,
      SunSpectralRadianceToLuminance: sunK,
      absorptionDensity: this.serializeDensityProfile(ozoneDensity),
      rayleighDensity: this.serializeDensityProfile([rayleighDensityLayer]),
      groundAlbedo,
      mieDensity: this.serializeDensityProfile([mieDensityLayer]),
      starAngularRadius: star.angularRadius,
      bottomRadius: planet.phisical.radius/kilometer,
      topRadius: (planet.phisical.radius + planet.phisical.atmosphereHeight)/kilometer,
    }
    return atmosphere;
  }
}
