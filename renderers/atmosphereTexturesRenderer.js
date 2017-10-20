import {
  kilometer,
  XYZ_TO_SRGB,
  CIE_2_DEG_COLOR_MATCHING_FUNCTIONS,
  MAX_LUMINOUS_EFFICACY,
  minLambda, maxLambda,
  lambdaR, lambdaG, lambdaB

} from './AtmosphereConstants.js';
// import {BufferAttribute} from 'three/src/core/BufferAttribute';
//import {BufferGeometry} from 'three/src/core/BufferGeometry';
// import {Mesh} from 'three/src/objects/Mesh';
import {Matrix4} from 'three/src/math/Matrix4';
import {Vector4} from 'three/src/math/Vector4';
import {Vector3} from 'three/src/math/Vector3';
import {Vector2} from 'three/src/math/Vector2';
import {PerspectiveCamera} from 'three/src/cameras/PerspectiveCamera';
// import {Color} from 'three/src/math/Color';
// import {RawShaderMaterial} from 'three/src/materials/RawShaderMaterial';
// import {WebGLRenderTarget} from 'three/src/renderers/WebGLRenderTarget.js';
// import {ShaderChunk} from 'three/src/renderers/shaders/ShaderChunk.js';
import * as THREE from 'three';

const BufferGeometry = THREE.BufferGeometry;
const Mesh = THREE.Mesh;
const ShaderChunk = THREE.ShaderChunk;
const BufferAttribute = THREE.BufferAttribute;
const RawShaderMaterial = THREE.RawShaderMaterial;
const WebGLRenderTarget = THREE.WebGLRenderTarget;

ShaderChunk.AtmosphereConstructor = require('../shaders/AtmosphereConstructor.glsl');
ShaderChunk.AtmosphereUniforms = require('../shaders/AtmosphereUniforms.glsl');
ShaderChunk.AtmosphereFunctions = require('../shaders/atmosphereFunctions.glsl');
ShaderChunk.textureDimensionsSetup = require('../shaders/textureDimensionsSetup.glsl');
ShaderChunk.texturesLookup = require('../shaders/texturesLookup.glsl');

const pow = Math.pow;

const LerpIncrements4 = [
  new Int32Array([0, 0, 0, 0]),
  new Int32Array([0, 0, 0, 1]),
  new Int32Array([0, 0, 1, 0]),
  new Int32Array([0, 0, 1, 1]),
  new Int32Array([0, 1, 0, 0]),
  new Int32Array([0, 1, 0, 1]),
  new Int32Array([0, 1, 1, 0]),
  new Int32Array([0, 1, 1, 1]),
  new Int32Array([1, 0, 0, 0]),
  new Int32Array([1, 0, 0, 1]),
  new Int32Array([1, 0, 1, 0]),
  new Int32Array([1, 0, 1, 1]),
  new Int32Array([1, 1, 0, 0]),
  new Int32Array([1, 1, 0, 1]),
  new Int32Array([1, 1, 1, 0]),
  new Int32Array([1, 1, 1, 1]),
].map(x => new Vector4(...x));

function getIrradianceResolution(planetProps) {
  const {resMus, resR} = planetProps;
  return [resMus * 2, resR / 2];
}

function getTransmittanceResolution(planetProps) {
  const {resMu, resR} = planetProps;
  return [resMu * 2, resR * 2];

}
const VertexShader = require('../shaders/ScreenSpaceVertexShader.glsl');

export class AtmosphereTexturesRenderer {

  constructor(threeRenderer) {
    this.renderer = threeRenderer;
    this.prepareShaders();
    this.initScreenSpaceMesh();
    this.textures = {};

    const atmosphere = require('../shaders/atmosphereShader.glsl');

    this.atmosphereMaterial = new RawShaderMaterial({
      uniforms: {
        viewInverse: {value: new Matrix4},
        projectionMatrix: {value: new Matrix4},
        projectionInverse: {value: new Matrix4},
        planetPosition: {value: new Vector3},
        resolution: {value: new Vector2},
        ttimeVar: {value: Math.PI / 2, type: 'f'},
        radius: {value: 0, type: 'f'},
        atmosphereHeight: {value: 100, type: 'f'},
      },
      vertexShader: VertexShader,
      fragmentShader: atmosphere,
      transparent: true

    });
    
    this.atmosphereMaterial.extensions.derivatives = true;
    this.atmosphereMaterial.needsUpdate = true;
  }

  initScreenSpaceMesh() {
    const geom = new BufferGeometry();
    const vtx = new Float32Array([
      -1, -1,
      1, -1,
      1, 1,
      -1, 1
    ]);
    const ind = new Uint16Array([0, 1, 2, 0, 2, 3]);
    geom.addAttribute('sspoint', new BufferAttribute(vtx, 2, false));
    geom.setIndex(new BufferAttribute(ind, 1));
    const mesh = new Mesh(geom);
    mesh.frustumCulled = false;
    this._nonUsedCamera = new PerspectiveCamera;

    this.screenSpaceMesh = mesh;
  }

  prepareShaders() {
    this.shaders = {
      transmittanceTexture: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/TransmittanceShader.glsl'),
        transparent: false
      }),

      irradianceTexture1: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/IrradianceShader1.glsl'),
        transparent: false
      }),

      irradianceTexture2: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/IrradianceShader2.glsl'),
        transparent: false
      }),

      irradianceTexture3: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/IrradianceShader3.glsl'),
        transparent: false
      }),

      irradianceTexture: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/IrradianceShader4.glsl'),
        transparent: false
      }),

      deltaIrradianceTexture1: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaIrradianceShader1.glsl'),
        transparent: false
      }),
      deltaIrradianceTexture2: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaIrradianceShader2.glsl'),
        transparent: false
      }),

      deltaIrradianceTexture3: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaIrradianceShader3.glsl'),
        transparent: false
      }),

      deltaIrradianceTexture4: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaIrradianceShader4.glsl'),
        transparent: false
      }),

      scatteringDensityTexture2: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/ScatteringDensityShader2.glsl'),
        transparent: false
      }),

      scatteringDensityTexture3: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/ScatteringDensityShader3.glsl'),
        transparent: false
      }),

      scatteringDensityTexture4: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/ScatteringDensityShader4.glsl'),
        transparent: false
      }),
      scatteringTexture1: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/ScatteringShader1.glsl'),
        transparent: false
      }),

      scatteringTexture2: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/ScatteringShader2.glsl'),
        transparent: false
      }),
      scatteringTexture3: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/ScatteringShader3.glsl'),
        transparent: false
      }),
      scatteringTexture: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/ScatteringShader4.glsl'),
        transparent: false
      }),

      singleMieScatteringTexture: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/SingleMieScatteringShader.glsl'),
        transparent: false
      }),

      deltaMultipleScatteringTexture: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaMultipleScatteringShader4.glsl'),
        transparent: false
      }),

      deltaMultipleScatteringTexture3: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaMultipleScatteringShader3.glsl'),
        transparent: false
      }),

      deltaMultipleScatteringTexture2: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaMultipleScatteringShader2.glsl'),
        transparent: false
      }),

      deltaMultipleScatteringTexture1: new RawShaderMaterial({
        vertexShader: VertexShader,
        fragmentShader: require('../shaders/atm/DeltaMultipleScatteringShader1.glsl'),
        transparent: false
      })
    };
  }

  renderTarget(atmosphere, target, name) {

    const material = this.shaders[name];
    if (!material) {
      throw new Error('cant find shader for: ' + name);
    }

    if (target.dependencies) {
      for (let k = 0; k < target.dependencies.length; ++k) {
        const dep = target.dependencies[k];
        const texture = this.getTexture(dep, atmosphere);
        material.uniforms[dep] = {value: texture};
      }
    }
    this.setupAtmosphereUniforms(material, atmosphere);
    this.screenSpaceMesh.material = material;

    console.log('>>>', name);
    const gl = this.renderer.context;
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    this.renderer.render(this.screenSpaceMesh, this._nonUsedCamera, target);

    

  }

  renderAtmospehereTexture(atmosphere, name) {
    const {planetUUID} = atmosphere;
    if (!this.textures[planetUUID]) {
      this.textures[planetUUID] = {};
    }
    if (!this.textures[planetUUID][name]) {
      const format = this.getTextureProps(name, atmosphere);
      this.textures[planetUUID][name] 
        = new WebGLRenderTarget(format.width, format.height, format);
      if (format.dependencies) {
        this.textures[planetUUID][name].dependencies = format.dependencies;
      }
    }
    const target = this.textures[planetUUID][name];
    this.renderTarget(atmosphere, target, name);
  }

  getTextureProps(name, atmosphere) {
    let type = THREE.FloatType, 
      format = THREE.RGBAFormat, 
      minFilter = THREE.LinearFilter,
      magFilter = THREE.LinearFilter,
      depthBuffer = false, 
      stencilBuffer = false,
      generateMipmaps = false,
      unpackAlignment = 1
    ;
    const {resMu, resNu, resR, resMus} = atmosphere;
    const sz = resNu * resMu * resMus * resR;
    const [width, height] = this.dimensions2d(atmosphere);
    switch (name) {
      case 'scatteringDensityTexture2': {
        return {
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipmaps,
          shader: name,
          minFilter, magFilter,
          dependencies: [
            'transmittanceTexture', 
            'singleMieScatteringTexture',
            'deltaMultipleScatteringTexture1',
            'deltaIrradianceTexture1'
          ]
        };
      }

      case 'scatteringDensityTexture3': {
        return {
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipmaps,
          shader: name,
          minFilter, magFilter,
          dependencies: [
            'transmittanceTexture', 
            'singleMieScatteringTexture',
            'deltaMultipleScatteringTexture2',
            'deltaIrradianceTexture2',
          ]
        };
      }

      case 'scatteringDensityTexture4': {
        return {
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipmaps,
          minFilter, magFilter,
          shader: name,
          dependencies: [
            'transmittanceTexture', 
            'singleMieScatteringTexture',
            'deltaMultipleScatteringTexture3',
            'deltaIrradianceTexture3',
          ]
        };
      }
      case 'scatteringTexture1': {
        return {
          type, format,
          width, height,
          unpackAlignment, generateMipmaps,
          depthBuffer, stencilBuffer,
          shader: name,
          minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
          dependencies: ['deltaMultipleScatteringTexture1', 'singleMieScatteringTexture']
        };
      }
      case 'scatteringTexture2': {
        return {
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipmaps,
          minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
          shader: name,
          dependencies: ['deltaMultipleScatteringTexture2', 'scatteringTexture1']
        };
      }
      case 'scatteringTexture3': {
        return {
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipmaps,
          minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
          shader: name,
          dependencies: ['deltaMultipleScatteringTexture3', 'scatteringTexture2']
        };
      }
      case 'scatteringTexture': {
        return {
          type, format,
          width, height,
          unpackAlignment, generateMipmaps,
          minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
          depthBuffer, stencilBuffer,
          shader: name,
          dependencies: ['deltaMultipleScatteringTexture', 'scatteringTexture3']
        };
      }

      case 'deltaMultipleScatteringTexture2': {
        return {
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipmaps,
          minFilter, magFilter,
          shader: name,
          dependencies: ['transmittanceTexture', 'scatteringDensityTexture2']
        };
      }
      case 'deltaMultipleScatteringTexture3': {
        return {
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipmaps,
          minFilter, magFilter,
          shader: name,
          dependencies: ['transmittanceTexture', 'scatteringDensityTexture3']
        };
      }

      case 'deltaMultipleScatteringTexture': {
        return {
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipmaps,
          shader: name,
          minFilter, magFilter,
          dependencies: ['transmittanceTexture', 'scatteringDensityTexture4']
        };
      }
      case 'deltaMultipleScatteringTexture1': {
        return {
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          unpackAlignment, generateMipmaps,
          shader: name,
          minFilter, magFilter,
          dependencies: ['transmittanceTexture']
        };
      }

      case 'irradianceTexture1': {
        const res = getIrradianceResolution(atmosphere);
        return {
          width: res[0],
          height: res[1],
          minFilter, magFilter,
          unpackAlignment, generateMipmaps,
          type, format, depthBuffer, stencilBuffer
        };
      }
      case 'irradianceTexture2': {
        const res = getIrradianceResolution(atmosphere);
        return {
          width: res[0],
          height: res[1],
          minFilter, magFilter,
          type, format, depthBuffer, stencilBuffer,
          dependencies: ['deltaIrradianceTexture2']
        };
      }
      case 'irradianceTexture3': {
        const res = getIrradianceResolution(atmosphere);
        return {
          width: res[0],
          height: res[1],
          minFilter, magFilter,
          unpackAlignment, generateMipmaps,
          type, format, depthBuffer, stencilBuffer,
          dependencies: ['deltaIrradianceTexture3', 'irradianceTexture2']
        };
      }
      case 'irradianceTexture': {
        const res = getIrradianceResolution(atmosphere);
        return {
          width: res[0],
          height: res[1],
          minFilter, magFilter,
          unpackAlignment, generateMipmaps,
          type, format, depthBuffer, stencilBuffer,
          dependencies: ['deltaIrradianceTexture4', 'irradianceTexture3']
        };
      }
      
      case 'deltaIrradianceTexture1': {
        const res = getIrradianceResolution(atmosphere);
        return {
          width: res[0],
          unpackAlignment, generateMipmaps,
          height: res[1],
          minFilter, magFilter,
          type, format, depthBuffer, stencilBuffer,
          dependencies: ['transmittanceTexture'] 
        };
      }
      case 'deltaIrradianceTexture2': {
        const res = getIrradianceResolution(atmosphere);
        return {
          width: res[0],
          height: res[1],
          unpackAlignment, generateMipmaps,
          minFilter, magFilter,
          type, format, depthBuffer, stencilBuffer,
          dependencies: [
            'singleMieScatteringTexture', 
            'deltaMultipleScatteringTexture1' ]
        };
      }
      case 'deltaIrradianceTexture3': {
        const res = getIrradianceResolution(atmosphere);
        return {
          width: res[0],
          height: res[1],
          minFilter, magFilter,
          unpackAlignment, generateMipmaps,
          type, format, depthBuffer, stencilBuffer,
          dependencies: ['singleMieScatteringTexture', 'deltaMultipleScatteringTexture2' ]
        };
      }
      case 'deltaIrradianceTexture4': {
        const res = getIrradianceResolution(atmosphere);
        return {
          width: res[0],
          height: res[1],
          unpackAlignment, generateMipmaps,
          minFilter, magFilter,
          type, format, depthBuffer, stencilBuffer,
          dependencies: ['singleMieScatteringTexture', 'deltaMultipleScatteringTexture3' ]
        };
      }

      case 'singleMieScatteringTexture': {
        return {
          type, format,
          width, height,
          depthBuffer, stencilBuffer,
          shader: name,
          unpackAlignment, generateMipmaps,
          minFilter, magFilter,
          dependencies: [
            'transmittanceTexture', 
          ]
        };
      }

      case 'transmittanceTexture': {
        const res = getTransmittanceResolution(atmosphere);
        return {
          width: res[0], 
          height: res[1], 
          type, format,
          minFilter, magFilter,
          unpackAlignment, generateMipmaps,
          depthBuffer: false,
          stencilBuffer: false,
          shader: name
        };

      }
      default:
        throw new Error('cant get props for texture' + name );
    }
  }

  getTexture(name, atmosphere) {
    const planetUUID = atmosphere.planetUUID;
    if (!this.textures[planetUUID] ) {
      this.renderAtmospehereTexture(atmosphere, name);
    }
    if (!this.textures[planetUUID][name]) {
      this.renderAtmospehereTexture(atmosphere, name);
    }
    return this.textures[planetUUID][name].texture;
  }

  dimensions2d({resMu, resNu, resR, resMus}) {
    const W = (resMus * (resNu)) * 4.0;
    const H = (resMu * 8.0);
    return [W, H];
  }

  setupAtmosphereUniforms(material, atmosphere) {

    material.uniforms.solarIrradiance = {value: new Vector3(...atmosphere.solarIrradiance)};
    material.uniforms.sunAngularRadius = {value: atmosphere.starAngularRadius};
    material.uniforms.bottomRadius = {value: atmosphere.bottomRadius};
    material.uniforms.topRadius = {value: atmosphere.topRadius};
    material.uniforms.rayleighDensity = {value: packProfile(atmosphere.rayleighDensity)};
    material.uniforms.rayleighScattering = {value: new Vector3(...atmosphere.rayleighScattering)};
    material.uniforms.mieDensity = {value: packProfile(atmosphere.mieDensity)};
    material.uniforms.mieScattering = {value: new Vector3(...atmosphere.mieScattering)};
    material.uniforms.mieExtinction = {value: new Vector3(...atmosphere.mieExtinction)};
    material.uniforms.miePhaseFunctionG = {value: atmosphere.miePhaseFunctionG};
    material.uniforms.absorptionDensity = {value: packProfile(atmosphere.absorptionDensity)};
    material.uniforms.absorptionExtinction = {value: atmosphere.absorptionExtinction};
    material.uniforms.groundAlbedo = {value: new Vector3(... atmosphere.groundAlbedo) };
    material.uniforms.muSMin = {value: atmosphere.muSMin};
    material.uniforms.LinearInterpolators = {value: LerpIncrements4};

    const {resMu, resNu, resMus, resR} = atmosphere;
    const [w, h] = this.dimensions2d(atmosphere);
    material.uniforms.resolutionOf4d = {
      value: new Vector2(w, h)
    };

    material.uniforms.sunDirection = {
      value: new Vector3(0, 1, 0)
    };

    material.uniforms._additional = {
      value: new Vector2((this.__zz % resNu) / resNu, (this.__ww % resMu) / resMu)
    };
    material.uniforms.atmosphereTableResolution = {value:
      new Vector4(resMus, resNu, resMu, resR)
    };
    material.uniforms.sun_size = {value:
      new Vector2(Math.tan(atmosphere.starAngularRadius), Math.cos(atmosphere.starAngularRadius))
    };
    material.uniforms.SkySpectralRadianceToLuminance = {
      value: new Vector3(...atmosphere.SkySpectralRadianceToLuminance)
    };
    material.uniforms.SunSpectralRadianceToLuminance = {
      value: new Vector3(...atmosphere.SunSpectralRadianceToLuminance)
    };
    material.uniforms.sun_radiance = {value:
      new Vector3(
        atmosphere.solarIrradiance[0] / atmosphere.sunSolidAngle,
        atmosphere.solarIrradiance[1] / atmosphere.sunSolidAngle,
        atmosphere.solarIrradiance[2] / atmosphere.sunSolidAngle)
    };

    material.uniforms.white_point = {value:
      new Vector3( 1, 1, 1)
    };
    /*
    for(let k in texturesMap){
      this.atmosphereMaterial.uniforms[k] = {value: texturesMap[k]}
    }
   */

    function packProfile(prof) {
      const layer1 = prof[0];
      const layer2 = prof[1];
      const arr = new Float32Array(10);
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

  getAtmosphereMaterial(planet, star, {planetPosition, camera}) {
    const param = Date.now() % 10000;
    const material = this.atmosphereMaterial;
    const atmosphere = this.getAtmosphere(planet, star);
    this.setupAtmosphereUniforms(material, atmosphere);

    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;
    const viewMatrix = new Matrix4().getInverse(camera.matrixWorld);
    const viewInverseMatrix = camera.matrixWorld.clone();
    const projectionInverse = new Matrix4().getInverse(camera.projectionMatrix);

    const textures = [
      'singleMieScatteringTexture',
      'deltaMultipleScatteringTexture1',
      'deltaMultipleScatteringTexture2',
      'scatteringDensityTexture3',
      'transmittanceTexture', 
      'scatteringTexture',
      'scatteringTexture2',
      'scatteringTexture3',
      'scatteringTexture1',
      'irradianceTexture',
      'irradianceTexture2',
      'irradianceTexture3',
      'deltaIrradianceTexture4',
    ];

    material.uniforms.exposure = {value: 10 };
    for (let i = 0 ;i < textures.length; ++i) {
      const tn = textures[i];
      const t = this.getTexture(tn, atmosphere);
      material.uniforms[tn] = {value: t};
    }

    const pp = planetPosition.clone();
    pp.multiplyScalar(1 / 1000);

    material.uniforms.resolution = {value: new Vector2(width, height)};
    material.uniforms.ttimeVar = {value: param / 1000};
    material.uniforms.planetPosition = {value: pp};
    material.uniforms.radius = {value: planet.spatial.radius};

    material.uniforms.viewMatrix = {value: viewMatrix};
    material.uniforms.viewInverseMatrix = {value: camera.matrixWorld.clone()};
    material.uniforms.projectionInverse = {value: projectionInverse};
    return material;
  }

  spectralRadianceToLuminanceFactors(wavelengths, solarIrradiance, power) {
    let k_r = 0.0, k_g = 0.0, k_b = 0.0;

    const solar_r = this.interpolate(wavelengths, solarIrradiance, lambdaR);
    const solar_g = this.interpolate(wavelengths, solarIrradiance, lambdaG);
    const solar_b = this.interpolate(wavelengths, solarIrradiance, lambdaB);
    const dlambda = 1;
    for (let lambda = minLambda; lambda < maxLambda; lambda += dlambda) {
      const x_bar = this.CieColorMatchingFunctionTableValue(lambda, 1);
      const y_bar = this.CieColorMatchingFunctionTableValue(lambda, 2);
      const z_bar = this.CieColorMatchingFunctionTableValue(lambda, 3);

      const xyz2srgb = XYZ_TO_SRGB;
      const r_bar = xyz2srgb[0] * x_bar + xyz2srgb[1] * y_bar + xyz2srgb[2] * z_bar;
      const g_bar = xyz2srgb[3] * x_bar + xyz2srgb[4] * y_bar + xyz2srgb[5] * z_bar;
      const b_bar = xyz2srgb[6] * x_bar + xyz2srgb[7] * y_bar + xyz2srgb[8] * z_bar;
      const irradiance = this.interpolate(wavelengths, solarIrradiance, lambda);
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
  defaultDensityProfileLayer() {
    return {
      width: 0,
      exp_term: 0,
      exp_scale: 0,
      linear_term: 0,
      constant_term: 0
    };
  }
  serializeDensityProfile(layers) {
    const kLayerCount = 2;
    while (layers.length < kLayerCount) {
      layers.unshift(this.defaultDensityProfileLayer());
    }
    const result = [];
    layers.forEach(layer => {
      const nl = {...layer};
      nl.width /= kilometer;
      nl.exp_scale *= kilometer;
      nl.linear_term *= kilometer;
      result.push(nl);
    });
    return result;
  }

  prepareSpecter(planetProps, star) {
    const {
      mieAngstromAlpha,
      mieAngstromBeta,
      mieScaleHeight,
      has_ozone,
      rayleigh,
      mieSingleScatteringAlbedo,
      maxOzoneNumberDensity,
      ozoneCrossSection,
    } = planetProps.phisical;
    const wavelengths = [];
    const solarIrradiance = [];
    const rayleighScattering = [];
    const mieScattering = [];
    const mieExtinction = [];
    const absorptionExtinction = [];
    const groundAlbedo = [];
    for (let l = minLambda; l <= maxLambda; l += 10) {
      const spectreIx = (l - minLambda) / 10;
      const lambda = l * 1e-3;
      const mie = mieAngstromBeta / mieScaleHeight * pow(lambda, -mieAngstromAlpha);
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
    const length = wavelengths.length;
    const spectresInitial = {
      wavelengths, solarIrradiance, rayleighScattering,
      mieScattering, mieExtinction, absorptionExtinction,
      groundAlbedo
    };
    const retSpectres = {};
    for (const k in spectresInitial) {
      retSpectres[k] = new Float64Array(spectresInitial[k]);
    }
    return retSpectres;
  }

  interpolate(wavelengths, waveLengthFunction, wavelength) {
    if (wavelengths.length != waveLengthFunction.length) {
      throw 'incorrect data';
    }
    if (wavelength < wavelengths[0]) {
      return waveLengthFunction[0];
    }
    for (let i = 0; i < wavelengths.length; ++i) {
      if (wavelength < wavelengths[i + 1]) {
        const u = (wavelength - wavelengths[i]) / (wavelengths[i + 1] - wavelengths[i]);
        const result =
          waveLengthFunction[i] * (1.0 - u) + waveLengthFunction[i + 1] * u;
        if (isNaN(result)) {
          throw 'interpolation result is nan';
        }
        return result;

      }
    }
  }

  spectreToRGB(wavelength, array, scale = 1.0) {
    const r = this.interpolate(wavelength, array, lambdaR) * scale;
    const g = this.interpolate(wavelength, array, lambdaG) * scale;
    const b = this.interpolate(wavelength, array, lambdaB) * scale;
    if (isNaN(r) || isNaN(b) || isNaN(g)) {
      throw 'results are NaN';
    }
    return [r, g, b];
  }

  CieColorMatchingFunctionTableValue(wavelength, column) {
    if (wavelength <= minLambda || wavelength >= minLambda) {
      return 0.0;
    }
    let u = (wavelength - minLambda) / 5.0;
    const row = Math.floor(u);
    if (!(row >= 0 && row + 1 < 95)) {
      throw 'incorrect row';
    }
    if (!(CIE_2_DEG_COLOR_MATCHING_FUNCTIONS[4 * row] <= wavelength &&
           CIE_2_DEG_COLOR_MATCHING_FUNCTIONS[4 * (row + 1)] >= wavelength)) {
      throw 'incorrect wavelength';
    }
    u -= row;
    return CIE_2_DEG_COLOR_MATCHING_FUNCTIONS[4 * row + column] * (1.0 - u) +
        CIE_2_DEG_COLOR_MATCHING_FUNCTIONS[4 * (row + 1) + column] * u;

  }
  getAtmosphere(planet, star) {
    const resMu = 128, resNu = 8, resMus = 32, resR = 32;
    const spectre = this.prepareSpecter(planet, star);
    const {mieScaleHeight, rayleighScaleHeight} = planet.phisical;
    const {wavelengths} = spectre;
    const mieDensityLayer = {
      width: 0,
      exp_term: 1,
      exp_scale: -1 / mieScaleHeight,
      linear_term: 0,
      constant_term: 0,
    };
    const rayleighDensityLayer = {
      width: 0,
      exp_term: 1,
      exp_scale: -1 / rayleighScaleHeight,
      linear_term: 0,
      constant_term: 0,
    };
    const ozoneDensity = [];
    ozoneDensity.push({
      width: 25000,
      exp_term: 0,
      exp_scale: 0,
      linear_term: 1 / 15000,
      constant_term: -2 / 3,
    });
    ozoneDensity.push({
      width: 0,
      exp_term: 0,
      exp_scale: 0,
      linear_term: -1 / 15000,
      constant_term: 8 / 3,
    });
    const solarIrradiance = this.spectreToRGB(wavelengths, spectre.solarIrradiance);
    const rayleighScattering = this.spectreToRGB(wavelengths, spectre.rayleighScattering, kilometer);
    const mieScattering = this.spectreToRGB(wavelengths, spectre.mieScattering, kilometer);
    const mieExtinction = this.spectreToRGB(wavelengths, spectre.mieExtinction, kilometer);
    const absorptionExtinction = this.spectreToRGB(wavelengths, spectre.absorptionExtinction, kilometer);
    const groundAlbedo = this.spectreToRGB(wavelengths, spectre.groundAlbedo, 1.0);
    const skyK = this.spectralRadianceToLuminanceFactors(wavelengths, spectre.solarIrradiance, -3);
    const sunK = this.spectralRadianceToLuminanceFactors(wavelengths, spectre.solarIrradiance, 0);
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
      bottomRadius: planet.phisical.radius / kilometer,
      topRadius: (planet.phisical.radius + planet.phisical.atmosphereHeight) / kilometer,
    };
    return atmosphere;
  }
}
