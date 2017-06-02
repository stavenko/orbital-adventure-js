import * as THREE from 'three/src/constants.js';
import {BufferGeometry} from 'three/src/core/BufferGeometry';
import {BufferAttribute} from 'three/src/core/BufferAttribute';
import {DataTexture} from 'three/src/textures/DataTexture.js'
import {Quaternion} from 'three/src/math/Quaternion';
import {Matrix4} from 'three/src/math/Matrix4';
import {Vector4} from 'three/src/math/Vector4';
import {Vector3} from 'three/src/math/Vector3';
import {Vector2} from 'three/src/math/Vector2';
import {Color} from 'three/src/math/Color';
import {Sphere} from 'three/src/math/Sphere';
import {Ray} from 'three/src/math/Ray';
import {Mesh} from 'three/src/objects/Mesh';
import {RawShaderMaterial} from 'three/src/materials/RawShaderMaterial';
import {LODMaterial} from '../materials/PlanetaryMaterial.jsx';
import {getLodGeometry} from '../math/Geometry.js';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {SphereBufferGeometry} from 'three/src/geometries/SphereBufferGeometry';

const kilometer = 1000;

const XYZ_TO_SRGB = [
  +3.2406, -1.5372, -0.4986,
  -0.9689, +1.8758, +0.0415,
  +0.0557, -0.2040, +1.0570
];
const CIE_2_DEG_COLOR_MATCHING_FUNCTIONS = [
  360, 0.000129900000, 0.000003917000, 0.000606100000,
  365, 0.000232100000, 0.000006965000, 0.001086000000,
  370, 0.000414900000, 0.000012390000, 0.001946000000,
  375, 0.000741600000, 0.000022020000, 0.003486000000,
  380, 0.001368000000, 0.000039000000, 0.006450001000,
  385, 0.002236000000, 0.000064000000, 0.010549990000,
  390, 0.004243000000, 0.000120000000, 0.020050010000,
  395, 0.007650000000, 0.000217000000, 0.036210000000,
  400, 0.014310000000, 0.000396000000, 0.067850010000,
  405, 0.023190000000, 0.000640000000, 0.110200000000,
  410, 0.043510000000, 0.001210000000, 0.207400000000,
  415, 0.077630000000, 0.002180000000, 0.371300000000,
  420, 0.134380000000, 0.004000000000, 0.645600000000,
  425, 0.214770000000, 0.007300000000, 1.039050100000,
  430, 0.283900000000, 0.011600000000, 1.385600000000,
  435, 0.328500000000, 0.016840000000, 1.622960000000,
  440, 0.348280000000, 0.023000000000, 1.747060000000,
  445, 0.348060000000, 0.029800000000, 1.782600000000,
  450, 0.336200000000, 0.038000000000, 1.772110000000,
  455, 0.318700000000, 0.048000000000, 1.744100000000,
  460, 0.290800000000, 0.060000000000, 1.669200000000,
  465, 0.251100000000, 0.073900000000, 1.528100000000,
  470, 0.195360000000, 0.090980000000, 1.287640000000,
  475, 0.142100000000, 0.112600000000, 1.041900000000,
  480, 0.095640000000, 0.139020000000, 0.812950100000,
  485, 0.057950010000, 0.169300000000, 0.616200000000,
  490, 0.032010000000, 0.208020000000, 0.465180000000,
  495, 0.014700000000, 0.258600000000, 0.353300000000,
  500, 0.004900000000, 0.323000000000, 0.272000000000,
  505, 0.002400000000, 0.407300000000, 0.212300000000,
  510, 0.009300000000, 0.503000000000, 0.158200000000,
  515, 0.029100000000, 0.608200000000, 0.111700000000,
  520, 0.063270000000, 0.710000000000, 0.078249990000,
  525, 0.109600000000, 0.793200000000, 0.057250010000,
  530, 0.165500000000, 0.862000000000, 0.042160000000,
  535, 0.225749900000, 0.914850100000, 0.029840000000,
  540, 0.290400000000, 0.954000000000, 0.020300000000,
  545, 0.359700000000, 0.980300000000, 0.013400000000,
  550, 0.433449900000, 0.994950100000, 0.008749999000,
  555, 0.512050100000, 1.000000000000, 0.005749999000,
  560, 0.594500000000, 0.995000000000, 0.003900000000,
  565, 0.678400000000, 0.978600000000, 0.002749999000,
  570, 0.762100000000, 0.952000000000, 0.002100000000,
  575, 0.842500000000, 0.915400000000, 0.001800000000,
  580, 0.916300000000, 0.870000000000, 0.001650001000,
  585, 0.978600000000, 0.816300000000, 0.001400000000,
  590, 1.026300000000, 0.757000000000, 0.001100000000,
  595, 1.056700000000, 0.694900000000, 0.001000000000,
  600, 1.062200000000, 0.631000000000, 0.000800000000,
  605, 1.045600000000, 0.566800000000, 0.000600000000,
  610, 1.002600000000, 0.503000000000, 0.000340000000,
  615, 0.938400000000, 0.441200000000, 0.000240000000,
  620, 0.854449900000, 0.381000000000, 0.000190000000,
  625, 0.751400000000, 0.321000000000, 0.000100000000,
  630, 0.642400000000, 0.265000000000, 0.000049999990,
  635, 0.541900000000, 0.217000000000, 0.000030000000,
  640, 0.447900000000, 0.175000000000, 0.000020000000,
  645, 0.360800000000, 0.138200000000, 0.000010000000,
  650, 0.283500000000, 0.107000000000, 0.000000000000,
  655, 0.218700000000, 0.081600000000, 0.000000000000,
  660, 0.164900000000, 0.061000000000, 0.000000000000,
  665, 0.121200000000, 0.044580000000, 0.000000000000,
  670, 0.087400000000, 0.032000000000, 0.000000000000,
  675, 0.063600000000, 0.023200000000, 0.000000000000,
  680, 0.046770000000, 0.017000000000, 0.000000000000,
  685, 0.032900000000, 0.011920000000, 0.000000000000,
  690, 0.022700000000, 0.008210000000, 0.000000000000,
  695, 0.015840000000, 0.005723000000, 0.000000000000,
  700, 0.011359160000, 0.004102000000, 0.000000000000,
  705, 0.008110916000, 0.002929000000, 0.000000000000,
  710, 0.005790346000, 0.002091000000, 0.000000000000,
  715, 0.004109457000, 0.001484000000, 0.000000000000,
  720, 0.002899327000, 0.001047000000, 0.000000000000,
  725, 0.002049190000, 0.000740000000, 0.000000000000,
  730, 0.001439971000, 0.000520000000, 0.000000000000,
  735, 0.000999949300, 0.000361100000, 0.000000000000,
  740, 0.000690078600, 0.000249200000, 0.000000000000,
  745, 0.000476021300, 0.000171900000, 0.000000000000,
  750, 0.000332301100, 0.000120000000, 0.000000000000,
  755, 0.000234826100, 0.000084800000, 0.000000000000,
  760, 0.000166150500, 0.000060000000, 0.000000000000,
  765, 0.000117413000, 0.000042400000, 0.000000000000,
  770, 0.000083075270, 0.000030000000, 0.000000000000,
  775, 0.000058706520, 0.000021200000, 0.000000000000,
  780, 0.000041509940, 0.000014990000, 0.000000000000,
  785, 0.000029353260, 0.000010600000, 0.000000000000,
  790, 0.000020673830, 0.000007465700, 0.000000000000,
  795, 0.000014559770, 0.000005257800, 0.000000000000,
  800, 0.000010253980, 0.000003702900, 0.000000000000,
  805, 0.000007221456, 0.000002607800, 0.000000000000,
  810, 0.000005085868, 0.000001836600, 0.000000000000,
  815, 0.000003581652, 0.000001293400, 0.000000000000,
  820, 0.000002522525, 0.000000910930, 0.000000000000,
  825, 0.000001776509, 0.000000641530, 0.000000000000,
  830, 0.000001251141, 0.000000451810, 0.000000000000,
];
const MAX_LUMINOUS_EFFICACY = 683.0;

const colors = [[0.5,0.5,0], [0.0, 1.0, 0.0], [0.3, 0.7, 1]];
const pow = Math.pow;

const minLambda = 360;
const maxLambda = 830;
const lambdaR = 680.0;
const lambdaG = 550.0;
const lambdaB = 440.0;

export class PlanetRenderer{
  constructor(camera, renderer, planets, globalPosition, worldManager){
    this.globalPosition = globalPosition;
    this.camera = camera;
    this.renderer = renderer;
    this.prepareProgram();
    this.prepareArrays();
    this.planets = planets;
    this.globalPosition = globalPosition;
    this.worldManager = worldManager;
    this.textureTypes = ['height', 'specular', 'color', 'normal'];
    this.visibleFaces = [ true, true, true, true, true, true ];
    this.renderer.setClearColor(0x000000);
    this.renderer.setClearAlpha(1);
    this._textureType = false;
    this._screenSpaceMesh = this.initScreenSpaceMesh();
    this.__ww = 0;
    this.__zz = 0;
    this.planetSpheres = planets.planets.map((planet,ix)=>{
      let {spatial} = planet;
      let geometry = new SphereBufferGeometry(spatial.radius*0.999, 100,100);
      let mesh = new Mesh(geometry, new MeshBasicMaterial({color: new Color(...colors[ix])}));
      mesh.position.set(...spatial.position);
      mesh.updateMatrix();
      mesh.updateMatrixWorld();
      return mesh;
    });
    this.lodMesh.material.transparent = true;
  }

  clearing(){

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
    //let spareTexture = new DataTexture(new Uint8Array(16), 2, 2, THREE.RGBAFormat, THREE.UnsignedByteType);

    let functions = require('../shaders/atmosphereFunctions.glsl');
    let atmosphere = require('../shaders/atmosphereShader.glsl');
    let total = functions + atmosphere;

    geom.setIndex(new BufferAttribute(ind, 1));
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
      vertexShader: require('../shaders/ScreenSpaceVertexShader.glsl'),
      fragmentShader: total,
      transparent: true

    });
    this.atmosphereMaterial.extensions.derivatives = true;
    this.atmosphereMaterial.needsUpdate = true;
    let mesh = new Mesh(geom, this.atmosphereMaterial);
    mesh.frustumCulled = false;

    return   mesh;
  }

  setFaceRendering(){
    this._textureType = !this._textureType;
    console.log(this._textureType);
  }
  setVisibleFaces(faces){
    console.log(faces);
    this.visibleFaces = faces;
  }

  render(){
    this.clearing();
    let c = this.camera.clone();
    c.quaternion.copy(this.globalPosition.quaternion);
    c.position.set(0,0,0);
    c.near = 1e-3;
    c.far = 1e10;
    c.updateMatrix();
    c.updateMatrixWorld();
    c.updateProjectionMatrix();
    this.renderPlanets(c);
  }

  renderPlanets(camera){
    let cp = this.globalPosition.position.toArray();
    let sorted = this.planets.planets.sort((b,a)=>{

      let ap = a.spatial.position;
      let bp = b.spatial.position;
      let ad = [ ap[0] - cp[0], ap[1] - cp[1], ap[2] - cp[2] ];
      let bd = [ bp[0] - cp[0], bp[1] - cp[1], bp[2] - cp[2] ];

      let d1 = ad[0]*ad[0] + ad[1]*ad[1] + ad[2]*ad[2]
      let d2 = bd[0]*bd[0] + bd[1]*bd[1] + bd[2]*bd[2]
      return  d1 - d2;
    })
    let star = this.planets.star;
    sorted.forEach((planet, ix)=>{
      let mesh = this.planetSpheres[ix];
      let planetProperties = {}
      this.renderLOD(planet, camera, planetProperties);
      this.renderAtmospehere(planet, camera, planetProperties, star);
      this.renderer.clear(false, true, true);
    })
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



  prepareAtmosphere(planet, star){
    console.warn("Small texture values for debug is setup");
    //const resMu=128, resNu=8, resMus=32, resR=32;
    const resMu=4, resNu=4, resMus=4, resR=4;
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


  renderAtmospehere(planet, camera, planetProperties, star){

    let cameraPosition = this.globalPosition.position.clone();
    camera.updateProjectionMatrix();
    let projectionInverse = new Matrix4().getInverse(camera.projectionMatrix);
    let viewMatrix = new Matrix4().getInverse(camera.matrixWorld);
    //let atmosphereTextures = this.worldManager.getPlanetAtmosphereTextures(planet)
    let width = this.renderer.domElement.width;
    let height = this.renderer.domElement.height;
    let planetPosition = planetProperties.cameraRelatedPosition;

    let r = planetPosition.length();
    let ur = Math.sqrt((r - planet.spatial.radius)/1000.0/planet.phisical.atmosphereHeight)

    let propUniforms = {};
    let param = Date.now()%10000;

    let atmosphereTextures = [
      'irradianceTexture',
      'scatteringTexture',
      'deltaIrradianceTexture',
      'transmittanceTexture'
    ];

    let texturesMap = {}

    const atmosphere = this.prepareAtmosphere(planet, star);
    atmosphereTextures.forEach(textureType=>{
      texturesMap[textureType] = this.worldManager.getTexture(planet.uuid, textureType, {
        textureType,
        ...atmosphere
      })
    })


    this.atmosphereMaterial.uniforms.solarIrradiance = {value: new Vector3(...atmosphere.solarIrradiance)};
    this.atmosphereMaterial.uniforms.sunAngularRadius = {value: atmosphere.sunAngularRadius};
    this.atmosphereMaterial.uniforms.bottomRadius= {value:atmosphere.bottomRadius};
    this.atmosphereMaterial.uniforms.topRadius = {value:atmosphere.topRadius};
    this.atmosphereMaterial.uniforms.rayleighDensity = {value: packProfile(atmosphere.rayleighDensity)};
    this.atmosphereMaterial.uniforms.rayleighScattering = {value:new Vector3(...atmosphere.rayleighScattering)};
    this.atmosphereMaterial.uniforms.mieDensity ={value: packProfile(atmosphere.mieDensity)};
    this.atmosphereMaterial.uniforms.mieScattering = {value: new Vector3(...atmosphere.mieScattering)};
    this.atmosphereMaterial.uniforms.mieExtinction = {value: new Vector3(...atmosphere.mieExtinction)};
    this.atmosphereMaterial.uniforms.miePhaseFunctionG = {value:atmosphere.miePhaseFunctionG};
    this.atmosphereMaterial.uniforms.absorptionDensity={value: packProfile(atmosphere.absorptionDensity)};
    this.atmosphereMaterial.uniforms.absorptionExtinction = {value:atmosphere.absorptionExtinction};
    this.atmosphereMaterial.uniforms.groundAlbedo = {value: new Vector3(... atmosphere.groundAlbedo) };
    this.atmosphereMaterial.uniforms.muSMin = {value:atmosphere.muSMin};

    this.atmosphereMaterial.uniforms.resolution =  {value: new Vector2(width, height)};
    this.atmosphereMaterial.uniforms.ttimeVar= {value: param/1000};
    this.atmosphereMaterial.uniforms.planetPosition= {value: planetPosition.clone()};
    this.atmosphereMaterial.uniforms.radius= {value: planet.spatial.radius};

    this.atmosphereMaterial.uniforms.viewMatrix= {value: viewMatrix};
    this.atmosphereMaterial.uniforms.viewInverseMatrix= {value: camera.matrixWorld.clone()};
    this.atmosphereMaterial.uniforms.projectionInverse= {value: projectionInverse};
    const {resMu, resNu, resMus, resR} = atmosphere;
    let [w,h] = this.worldManager.dimensions2d(resMu*resNu*resR*resMus);
    this.atmosphereMaterial.uniforms.resolutionOf4d ={
      value: new Vector2(w,h)
    }
    this.atmosphereMaterial.uniforms._additional = {
      value: new Vector2((this.__zz%resNu)/resNu, (this.__ww%resMu)/resMu)
    }
    this.atmosphereMaterial.uniforms.atmosphereTableResolution = {value:
      new Vector4(resMus, resNu, resMu, resR)
    }
    this.atmosphereMaterial.uniforms.sun_size = {value:
      new Vector2(Math.tan(atmosphere.sunAngularRadius), Math.cos(atmosphere.sunAngularRadius))
    }
    this.atmosphereMaterial.uniforms.SunSpectralRadianceToLuminance = {
      value: new Vector3(...atmosphere.sun)
    }
    this.atmosphereMaterial.uniforms.sun_radiance = {value:
      new Vector3(
        atmosphere.solarIrradiance[0]/ atmosphere.sunSolidAngle,
        atmosphere.solarIrradiance[1]/ atmosphere.sunSolidAngle,
        atmosphere.solarIrradiance[2]/ atmosphere.sunSolidAngle)
    }

    this.atmosphereMaterial.uniforms.white_point = {value:
      new Vector3( 1, 1, 1)
    }

    this.atmosphereMaterial.uniforms.exposure = {value: 10 }
    for(let k in texturesMap){
      this.atmosphereMaterial.uniforms[k] = {value: texturesMap[k]}
    }

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



    this.renderer.render(this._screenSpaceMesh, camera);
  }

  setupClipping(planet, withCamera){
    let {spatial} = planet;
    let {position, radius} = spatial;
    let v = withCamera.position.clone().sub(new Vector3(...position));
    let cameraDir = new Vector3(0,0,1).applyMatrix4(withCamera.matrixWorld).sub(withCamera.position).normalize();
    let distance = cameraDir.dot(v);
    let nearerPoint = Math.abs(distance - radius ) * 0.2;
    let near = Math.max(0.01, distance - radius - nearerPoint);
    let far = distance + radius;
    withCamera.near = near;
    withCamera.far = far;
    withCamera.updateProjectionMatrix();
  }

  renderSphere(mesh, camera){
    this.renderer.render(mesh, camera);
  }

  renderPlanetSpheres(withCamera){
    this.planetSpheres.forEach((mesh,ix)=>{
      this.renderer.render(mesh, withCamera);
    })
  }

  renderLOD(planet, withCamera, planetProperties){

    let {radius, position, north} = planet.spatial;
    let cameraPosition = this.globalPosition.position.clone();

    let planetPosition = new Vector3(...position);
    let cameraDir = planetPosition.clone().sub(cameraPosition);
    let distanceToCamera =cameraDir.length();
    cameraDir.normalize();


    let lodCenter = planetPosition.clone().add(cameraDir.negate().multiplyScalar(radius));

    planetProperties.nearestPoint = lodCenter.clone();
    planetProperties.cameraRelatedPosition = planetPosition.clone().sub(cameraPosition);


    let size = Math.acos(radius / distanceToCamera) * 2 * radius;

    let northVector = new Vector3(...north);
    let eastVector = new Vector3().crossVectors(northVector, cameraDir ).normalize().negate();

    //cubemap lookup
    /*
 major axis
      direction     target	            		           sc     tc    ma
      ----------    -------------------------------    ---    ---   ---
       +rx	        TEXTURE_CUBE_MAP_POSITIVE_X_ARB    -rz    -ry   rx
       -rx	        TEXTURE_CUBE_MAP_NEGATIVE_X_ARB    +rz    -ry   rx

       +ry	        TEXTURE_CUBE_MAP_POSITIVE_Y_ARB    +rx    +rz   ry
       -ry	        TEXTURE_CUBE_MAP_NEGATIVE_Y_ARB    +rx    -rz   ry
       +rz	        TEXTURE_CUBE_MAP_POSITIVE_Z_ARB    +rx    -ry   rz
       -rz	        TEXTURE_CUBE_MAP_NEGATIVE_Z_ARB    -rx    -ry   rz

      s   =	( sc/|ma| + 1 ) / 2
      t   =	( tc/|ma| + 1 ) / 2
     */

    // *** stupid setup ***
    this.lodMesh.scale.set(...[size, size, size]);

    lodCenter.sub(cameraPosition);


    let planetRotation = planet.initialQuaternion.clone();
    let rotationAngle = planet.time;
    let quat = new Quaternion().setFromAxisAngle(northVector, rotationAngle/10000);
    planetRotation = planetRotation.multiply(quat);


    this.lodMesh.position.copy(lodCenter);
    this.lodMesh.updateMatrix();
    this.lodMesh.updateMatrixWorld();

    withCamera.updateProjectionMatrix();
    withCamera.updateMatrixWorld();
    let viewInverse = new Matrix4().getInverse(withCamera.matrixWorld);
    this.setupUniforms({
      center: lodCenter,
      planetCenter: planetPosition.sub(cameraPosition),
      north: northVector,
      east: eastVector,
      radius,
      size,
      planetRotation,
      someColor: new Vector3(1,0,0),
      viewInverseM:  viewInverse.clone(),
      viewM:  withCamera.matrixWorld.clone(),
      modelM:  this.lodMesh.matrixWorld.clone(),
      projectionM:  withCamera.projectionMatrix.clone()
    })

    let fovPerPixel = withCamera.fov/ withCamera.zoom / this.renderer.domElement.height;
    fovPerPixel = fovPerPixel/180 * Math.PI;
    let pixelSize =  Math.tan(fovPerPixel/2)*2;
    let viewProjectionMatrix = new Matrix4().multiplyMatrices(withCamera.projectionMatrix, viewInverse);

    let texTimes = Date.now();
    let cameraDirection = new Vector3(0,0,1).transformDirection(withCamera.matrixWorld);
    let textures = this.worldManager
      .findTexturesWithin(viewProjectionMatrix.clone(), cameraDirection,
                          planetRotation.clone().inverse(),
                          radius,
                          planetPosition, pixelSize);
    let TM = Date.now() - texTimes;

    if(textures.length > 50)
      console.warn("So many textures", textures.length);

    let renderTimeStart = Date.now();
    textures.forEach(this.renderTexturesWithLOD(planet, withCamera));
    let RT = Date.now() - renderTimeStart;
    //console.log("times", TM, RT);

  }


  kross(v1, v2){
    return v1[0]*v2[1] - v2[0]*v1[1];
  }

  getWorldPosition(ssCoords, position, radius, camera){
    let prjInverse = new Matrix4;
    prjInverse.multiplyMatrices( camera.matrixWorld, prjInverse.getInverse(camera.projectionMatrix));
    let dir = new Vector3(ssCoords[0], ssCoords[1], 0.5).applyMatrix4(prjInverse);
    let ray = new Ray(new Vector3(0,0,0), dir.normalize());
    return ray.intersectSphere(new Sphere(position, radius));
  }

  intersectPlanet(screenSpaceCoords, planet, radius, camera){
    let worldPosition = this.getWorldPosition(screenSpaceCoords, planet, radius, camera );
    let normal;
    let pixelSize;

    let fovPerPixel = camera.fov/ camera.zoom / this.renderer.domElement.width;
    fovPerPixel = fovPerPixel/180 * Math.PI;

    if(worldPosition) {
      normal = new Vector3().subVectors(worldPosition, planet).normalize()
      let distance = worldPosition.length();
      pixelSize = distance * Math.tan(fovPerPixel/2)*2;
    }

    return {
      worldPosition,
      normal,
      pixelSize
    }
  }
  doSomethingWithInput(keyCode){
    if(keyCode == 106) ++this.__zz
    if(keyCode == 111) --this.__zz
    if(keyCode == 107) ++this.__ww;
    if(keyCode == 109) --this.__ww
  }

  findClosestTileInScreenSpace(planetPosition, viewProjectionMatrix){
    let center = planetPosition.clone().normalize();
    center.applyMatrix4(viewProjectionMatrix);
    let screenSegments = [
      [[-1,1], [-1,-1]],
      [[-1,1], [1,1]],
      [[1,1], [1,-1]],
      [[-1,-1],[1,-1]]
    ]
    let intersects = [];
    for(let i = 0; i< screenSegments.length; ++i){
      let segment = screenSegments[i];
      let [p1,p2] = segment;
      let d = [p2[0] - p1[0], p2[1] - p1[1]];
      let delta = [0 - p1[0], 0 - p1[1]];
      let K = this.kross(d, [center.x, center.y]);
      let t = this.kross(delta, d) / K;
      if((t < 0) || !isFinite(t) || t > 1.0) {
        continue;
      }
      intersects.push({t,p:[center.x *t, center.y*t]})
    }
    let intersect;
    if(intersects.length == 0){
      return {p:[center.x, center.y]};
    } else{
      if(intersects.length> 1){
        intersects.sort((i1,i2)=>i1.t - i2.t);
      }
      return intersects[0];
    }
  }

  initTextureCaches(to){
    to.texturesCache = {};
    this.textureTypes.forEach(t=>to.texturesCache[t] = [[],[],[],[],[],[],[]]);
  }

  renderTexturesWithLOD(planet, camera){
    this.noMoreRendering = false;
    return params => {
      let {s, t, lod, tile, face } = params;
      let division = Math.pow(2, lod);

      if(this.noMoreRendering) return;
      if(!planet.texturesCache) this.initTextureCaches(planet);
      this.textureTypes.forEach(textureType=>{

        if(!planet.texturesCache[textureType][face][lod])
          planet.texturesCache[textureType][face][lod] = new Map;
        if(!planet.texturesCache[textureType][face][lod].has(tile))
          this.prepareTexture(planet, {...params, tile, textureType});

        let texture = planet.texturesCache[textureType][face][lod].get(tile);
        if(!texture) return;
        this.material.uniforms[textureType+'Map'] = {value:texture};
      })
      this.material.uniforms.logDepthBufC={
        value:  2.0 / ( Math.log( camera.far + 1.0 ) / Math.LN2 )
      };
      this.material.uniforms.division={value:division};
      this.material.uniforms.lod={value:lod};
      this.material.uniforms.samplerStart={value:new Vector2(s,t)};
      this.material.uniforms.shownFaces={value:this.visibleFaces[face]};
      this.material.uniforms.textureTypeAsColor={value:this._textureType};
      this.material.uniforms.fface={value:face};
      this.renderer.render(this.lodMesh, camera);
    }
  }

  prepareTexture(planet, params){
    let {textureType, lod, face, tile} = params;
    if(textureType === 'specular' ||  textureType === 'color'
       // || textureType === 'normal'
      )
      return;
    let t = this.worldManager.getTexture(planet.uuid, params.textureType, params);
    planet.texturesCache[textureType][face][lod].set(tile, t);
  }

  setupUniforms(values){
    for(let key in values){
      this.material.uniforms[key] = {value: values[key]}
    }
    this.material.needsUpdate = true;
  }

  setupArray(){
  }

  renderAllTextures(){
  }

  prepareArrays(){
    this.lodGeometry = getLodGeometry();
    this.lodMesh = new Mesh(this.lodGeometry, this.material);
  }

  prepareProgram(){
    this.material = new LODMaterial();
  }
}
