import {Quaternion} from 'three/src/math/Quaternion';
import {Matrix4} from 'three/src/math/Matrix4';
import {Color} from 'three/src/math/Color';
import {Sphere} from 'three/src/math/Sphere';
import {Ray} from 'three/src/math/Ray';
import {Mesh} from 'three/src/objects/Mesh';
import {Scene} from 'three/src/scenes/Scene';
import {LODMaterial} from '../materials/PlanetaryMaterial.jsx';
import {getLodGeometry} from '../math/Geometry.js';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {AtmosphereTexturesRenderer} from './atmosphereTexturesRenderer.js';
import {SuperTextureRenderer} from './SuperTexturesRenderer.ts';
import * as THREE from 'three';

const BufferGeometry = THREE.BufferGeometry;
const BufferAttribute = THREE.BufferAttribute;
const WebGLRenderTarget = THREE.WebGLRenderTarget;
const ShaderChunk = THREE.ShaderChunk;
const Vector3 = THREE.Vector3;

ShaderChunk.getPerlinValue = require('../shaders/heightUtils/perlin3d.glsl');
ShaderChunk.getHeightValue = require('../shaders/heightUtils/getHeightValue.glsl');
ShaderChunk.calculateNormal = require('../shaders/heightUtils/calculateNormal.glsl');
ShaderChunk.quaternion = require('../shaders/lod/quaternion.glsl');


export const colors = [[0.5, 0.5, 0], [0.0, 1.0, 0.0], [0.3, 0.7, 1]];
const TileSourceMapSize = 128;
const NormalFOV = 45; // degrees;
export class PlanetRenderer {
  constructor(camera, renderer, planets, globalPosition, worldManager) {
    this.globalPosition = globalPosition;
    this.camera = camera;
    this.renderer = renderer;
    this.prepareProgram();
    this.prepareArrays();
    this.atmosphereRenderer = new AtmosphereTexturesRenderer(renderer); 
    //this.surfaceRenderer = new SurfaceTextureGenerator(renderer); 
    this.__render = this.__render.bind(this);
    this.superTextureRenderer = new SuperTextureRenderer(renderer, this.__render);
    this.planets = planets;
    // this.tileRetriver = new TileRetriver; 
    this.planets.planets.forEach(pl => pl.texturesCache = {});
    this.globalPosition = globalPosition;
    this.worldManager = worldManager;
    this.textureTypes = ['height', 'normal'];
    this.visibleFaces = [ true, true, true, true, true, true ];
    this.renderer.setClearColor(0x000000);
    this.renderer.setClearAlpha(1);
    this._textureType = false;
    this._screenSpaceMesh = this.initScreenSpaceMesh();
    this._screenSpaceScene = new Scene;
    this._lodMeshScene = new Scene;
    this._screenSpaceScene.add(this._screenSpaceMesh);
    this._lodMeshScene.add(this.lodMesh);
    this.__ww = 0;
    this.__zz = 0;
    // this.___someShit();
    this.pixelsSource = new Uint8Array(TileSourceMapSize * TileSourceMapSize * 4 );
    this.planetSpheres = planets.planets.map((planet, ix) => {
      const {spatial} = planet;
      const geometry = new THREE.SphereBufferGeometry(spatial.radius * 0.999, 100, 100);
      const mesh = new THREE.Mesh(geometry, new MeshBasicMaterial({color: new Color(...colors[ix])}));
      mesh.position.set(...spatial.position);
      mesh.updateMatrix();
      mesh.updateMatrixWorld();
      return mesh;
    });
    // this.lodMesh.material.transparent = true;
    const {drawingBufferHeight, drawingBufferWidth} = this.renderer.context;
    this.planetDiffuseColorTarget = new WebGLRenderTarget(drawingBufferWidth, drawingBufferHeight);
    this.planetTilesTarget = new WebGLRenderTarget(TileSourceMapSize, TileSourceMapSize, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false
    });
  }

  ___someShit() {
    const v = new Vector3(0.002, 0.003, 0.004);
    const view = [ 0.963239971408044, -0.26302824444657114, 0.05463423931185677, 
      0, 0.042454598550026486, 0.3498592394104325, 0.9358397938007924, 0, 
      -0.26526659145807735, -0.8991188215261141, 0.3481651622918425, 
      0, -0.00336512889067782, -0.0006014881716836106, -0.03161184970722086, 1];
    const viewMatrix = new Matrix4().fromArray(view);

    const proj = [ 
      1175.9625413238075, 0, 0, 0, 
      0, 2339.8448341436406, 0, 0, 
      0, 0, -100, 0, 
      -0.013405309412218656, -0.16416751160442916, -0, 1 ];
    const projMatrix = new Matrix4().fromArray(proj);

    console.log(v.clone().applyMatrix4(viewMatrix).applyProjection(projMatrix));
    
    

  }

  clearing() {

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
    return mesh;
  }

  setFaceRendering() {
    this._textureType = !this._textureType;
    console.log(this._textureType);
  }
  setVisibleFaces(faces) {
    console.log(faces);
    this.visibleFaces = faces;
  }

  render() {
    this.clearing();
    const c = this.camera.clone();
    c.quaternion.copy(this.globalPosition.quaternion);
    c.up.applyQuaternion(c.quaternion);
    c.position.set(0, 0, 0);
    c.near = 1e-3;
    c.far = 1e10;
    c.updateMatrix();
    c.updateMatrixWorld();
    c.updateProjectionMatrix();
    this.renderPlanets(c);
  }

  renderPlanets(camera) {
    const cp = this.globalPosition.position.toArray();
    const sorted = this.planets.planets.sort((b, a) => {
      const ap = a.spatial.position;
      const bp = b.spatial.position;
      const ad = [ ap[0] - cp[0], ap[1] - cp[1], ap[2] - cp[2] ];
      const bd = [ bp[0] - cp[0], bp[1] - cp[1], bp[2] - cp[2] ];

      const d1 = ad[0] * ad[0] + ad[1] * ad[1] + ad[2] * ad[2];
      const d2 = bd[0] * bd[0] + bd[1] * bd[1] + bd[2] * bd[2];
      return d1 - d2;
    });
    const star = this.planets.star;
    sorted.forEach(planet => {
      // const mesh = this.planetSpheres[ix];
      const planetProperties = {};
      this.superTextureRendering(planet, camera);
      // this.renderLOD(planet, camera, planetProperties);
      this.renderAtmospehere(planet, camera, planetProperties, star);
      this.renderer.clear(false, true, true);
    });
  }


  renderAtmospehere(planet, camera, planetProperties, star) {

    // const cameraPosition = this.globalPosition.position.clone();
    camera.updateProjectionMatrix();
    //const width = this.renderer.domElement.width;
    // const height = this.renderer.domElement.height;
    const planetPosition = new Vector3(...planet.spatial.position).sub(this.globalPosition.position);

    //const propUniforms = {};
    const material = this.atmosphereRenderer.getAtmosphereMaterial(planet, star, {camera, planetPosition});

    
    this._screenSpaceMesh.material = material;
    material.uniforms.tilesTexture = {
      value: this.planetTilesTarget.texture
    };
    
    material.uniforms.planetSurfaceColor = {value: this.planetDiffuseColorTarget.texture};
    this.renderer.clear(false, true, true);
    this.renderer.render(this._screenSpaceScene, camera);
  }

  setupClipping(planet, withCamera) {
    const {spatial} = planet;
    const {position, radius} = spatial;
    const v = withCamera.position.clone().sub(new Vector3(...position));
    const cameraDir = new Vector3(0, 0, 1).applyMatrix4(withCamera.matrixWorld).sub(withCamera.position).normalize();
    const distance = cameraDir.dot(v);
    const nearerPoint = Math.abs(distance - radius ) * 0.2;
    const near = Math.max(0.01, distance - radius - nearerPoint);
    const far = distance + radius;
    withCamera.near = near;
    withCamera.far = far;
    withCamera.updateProjectionMatrix();
  }

  renderSphere(mesh, camera) {
    this.renderer.render(mesh, camera);
  }

  calculatePlanetRotation(planet) {
    const northVector = new Vector3(...planet.spatial.north);
    const planetRotation = planet.initialQuaternion.clone();
    const rotationAngle = planet.time || 0;
    const quat = new Quaternion().setFromAxisAngle(northVector, rotationAngle / 100000);
    // return new Quaternion;
    return planetRotation.multiply(quat);

  }

  clamp(v, m, M) {
    return Math.min(M, Math.max(v, m));
  }

  __render(mesh, camera, fb = null) {
    this.renderer.render(mesh, camera, fb);
  } 

  startStencilWriteAndCheck() {
    const gl = this.renderer.getContext();
    gl.enable(gl.STENCIL_TEST);
    gl.stencilFunc(gl.EQUAL, 0, 0xFF);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
  }
  stopStencilWriteAndCheck() {
    const gl = this.renderer.getContext();
    gl.stencilFunc(gl.ALWAYS, 0, 0xFF);
    gl.disable(gl.STENCIL_TEST);
  }

  superTextureRendering(planet, withCamera) {
    const globalPosition = this.globalPosition.position.clone();
    const planetRotation = this.calculatePlanetRotation(planet);
    const planetPosition = new Vector3(...planet.spatial.position).sub(globalPosition);
    const pixelFovRatio = (withCamera.fov / withCamera.zoom) / NormalFOV;
    this.renderer.setClearAlpha(0);
    this.renderer.clearTarget(this.planetDiffuseColorTarget, true, true, true);
    this.startStencilWriteAndCheck();
    const textures = this.superTextureRenderer.getTexturesDescriptorAt(planet, globalPosition, planetRotation, pixelFovRatio);

    textures.forEach((dsc, ix) => {
      const result = this.superTextureRenderer.getTexture(dsc);
      if (!result) {
        return;
      }
      const lodMesh = this.lodMeshes[ix];
      const [td, t] = result;
      const ufs = lodMesh.material.uniforms;
      const material = lodMesh.material;
      
      ufs.planetPosition = {value: planetPosition};
      ufs.rotation = {value: planetRotation};
      ufs.heightMap = {value: t};
      ufs.lod = {value: td.lod};
      ufs.textureCenter = {value: td.coords.st.clone()}; 
      ufs.face = {value: td.coords.face}; 
      ufs.radius = {value: planet.spatial.radius};
      ufs.textureHorizont = {value: td.textureSize}; 
      ufs.basisS = {value: td.basisOfSurface[0]}; 
      ufs.basisT = {value: td.basisOfSurface[1]}; 
      ufs.myViewMatrix = {value: new Matrix4().getInverse(withCamera.matrixWorld)};
      ufs.myProjectionMatrix = {value: withCamera.projectionMatrix.clone()};
      ufs.logDepthBufC = {value: 2.0 / ( Math.log(withCamera.far + 1.0 ) / Math.LN2 )};
      // material.side = THREE.BackSide;
      material.needsUpdate = true;
      lodMesh.frustumCulled = false;

      this.renderer.render(lodMesh, withCamera, this.planetDiffuseColorTarget);
    });
    this.stopStencilWriteAndCheck();
  }



  parseTextures(pixelStore) {
    const textures = [];
    const intView = new DataView(pixelStore);

    const unique = new Set;
    for (let i = 0; i < TileSourceMapSize * TileSourceMapSize; ++i) {
      const uint = intView.getUint32(i * 4);
      if (uint === 0) {
        continue;
      }
      unique.add(uint);
    }
    const uniqueArray = new Uint32Array(unique);
    for (let i = 0; i < uniqueArray.length; ++i) {
      const faceLod = 255 - (uniqueArray[i] & 0xff);
      const lod = Math.floor(faceLod / 6);
      const face = faceLod % 6;
      const fb = (uniqueArray[i] >> 8) & 0xff;
      const sb = (uniqueArray[i] >> 16) & 0xff;
      const tb = (uniqueArray[i] >> 24) & 0xff;
      const tile = (tb * 256 + sb) * 256 + fb;
      
      const division = Math.pow(2, lod);
      const J = Math.floor(tile / division);
      const I = tile % division;
      const s = J / division;
      const t = I / division;
      textures.push({ s, t, lod, tile, face });
      if (tile < 0 ) {
        throw new Error('negative tile');
      }
    }
    return textures;
  }


  kross(v1, v2) {
    return v1[0] * v2[1] - v2[0] * v1[1];
  }

  getWorldPosition(ssCoords, position, radius, camera) {
    const prjInverse = new Matrix4;
    prjInverse.multiplyMatrices( camera.matrixWorld, prjInverse.getInverse(camera.projectionMatrix));
    const dir = new Vector3(ssCoords[0], ssCoords[1], 0.5).applyMatrix4(prjInverse);
    const ray = new Ray(new Vector3(0, 0, 0), dir.normalize());
    return ray.intersectSphere(new Sphere(position, radius));
  }

  intersectPlanet(screenSpaceCoords, planet, radius, camera) {
    const worldPosition = this.getWorldPosition(screenSpaceCoords, planet, radius, camera );
    let normal;
    let pixelSize;

    let fovPerPixel = camera.fov / camera.zoom / this.renderer.domElement.width;
    fovPerPixel = fovPerPixel / 180 * Math.PI;

    if (worldPosition) {
      normal = new Vector3().subVectors(worldPosition, planet).normalize();
      const distance = worldPosition.length();
      pixelSize = distance * Math.tan(fovPerPixel / 2) * 2;
    }

    return {
      worldPosition,
      normal,
      pixelSize
    };
  }
  doSomethingWithInput(keyCode) {
    if (keyCode === 106) {
      ++this.__zz;
    }
    if (keyCode === 111) {
      --this.__zz;
    }
    if (keyCode === 107) {
      ++this.__ww;
    }
    if (keyCode === 109) {
      --this.__ww;
    }
  }


  prepareArrays() {
    const highLodGeometry = getLodGeometry(512);
    this.lodMeshes = [
      new Mesh(highLodGeometry.clone(), new LODMaterial()),
      new Mesh(highLodGeometry.clone(), new LODMaterial()),
      new Mesh(highLodGeometry.clone(), new LODMaterial()),
    ] ;
    this.___randoms = [
      new THREE.Vector2(-0.5, 0),
      new THREE.Vector2(0.5, 0),
      new THREE.Vector2(0, 0.5)

    ];
    this.lodMesh = new Mesh(highLodGeometry, this.material);
    this.lodMesh.frustumCulled = false;
  }


  prepareProgram() {
    this.material = new LODMaterial();
    // this.material.wireframe = true;
    // this.lodCalculator = new LodCalculatorMaterial();
  }
}
