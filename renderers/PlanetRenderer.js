import * as THREE from 'three/src/constants.js';
import {WebGLRenderTarget} from 'three/src/renderers/WebGLRenderTarget.js';
import {BufferGeometry} from 'three/src/core/BufferGeometry';
import {BufferAttribute} from 'three/src/core/BufferAttribute';
// import {DataTexture} from 'three/src/textures/DataTexture.js';
import {Quaternion} from 'three/src/math/Quaternion';
import {Matrix4} from 'three/src/math/Matrix4';
// import {Vector4} from 'three/src/math/Vector4';
import {Vector3} from 'three/src/math/Vector3';
// import {Vector2} from 'three/src/math/Vector2';
import {Color} from 'three/src/math/Color';
import {Sphere} from 'three/src/math/Sphere';
import {Ray} from 'three/src/math/Ray';
import {Mesh} from 'three/src/objects/Mesh';
import {LODMaterial, LodCalculatorMaterial} from '../materials/PlanetaryMaterial.jsx';
import {getLodGeometry} from '../math/Geometry.js';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {SphereBufferGeometry} from 'three/src/geometries/SphereBufferGeometry';
import {AtmosphereTexturesRenderer} from './atmosphereTexturesRenderer.js';
import {SurfaceTextureGenerator} from './SurfaceTextureGeneration.js';
import {SuperTextureRenderer} from './SuperTexturesRenderer.ts';
import {TileRetriver} from './TileRetriver.js';


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
    this.surfaceRenderer = new SurfaceTextureGenerator(renderer); 
    this.superTextureRenderer = new SuperTextureRenderer(renderer);
    this.planets = planets;
    this.tileRetriver = new TileRetriver; 
    this.planets.planets.forEach(pl => pl.texturesCache = {});
    this.globalPosition = globalPosition;
    this.worldManager = worldManager;
    this.textureTypes = ['height', 'normal'];
    this.visibleFaces = [ true, true, true, true, true, true ];
    this.renderer.setClearColor(0x000000);
    this.renderer.setClearAlpha(1);
    this._textureType = false;
    this._screenSpaceMesh = this.initScreenSpaceMesh();
    this.__ww = 0;
    this.__zz = 0;
    // this.___someShit();
    this.pixelsSource = new Uint8Array(TileSourceMapSize * TileSourceMapSize * 4 );
    this.planetSpheres = planets.planets.map((planet, ix) => {
      const {spatial} = planet;
      const geometry = new SphereBufferGeometry(spatial.radius * 0.999, 100, 100);
      const mesh = new Mesh(geometry, new MeshBasicMaterial({color: new Color(...colors[ix])}));
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
    sorted.forEach((planet, ix) => {
      const mesh = this.planetSpheres[ix];
      const planetProperties = {};
      this.superTextureRendering(planet);
      // this.renderLOD(planet, camera, planetProperties);
      this.renderAtmospehere(planet, camera, planetProperties, star);
      this.renderer.clear(false, true, true);
    });
  }


  renderAtmospehere(planet, camera, planetProperties, star) {

    const cameraPosition = this.globalPosition.position.clone();
    camera.updateProjectionMatrix();
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;
    const planetPosition = new Vector3(...planet.spatial.position).sub(this.globalPosition.position);

    const propUniforms = {};
    const material = this.atmosphereRenderer.getAtmosphereMaterial(planet, star, {camera, planetPosition});

    
    this._screenSpaceMesh.material = material;
    material.uniforms.tilesTexture = {
      value: this.planetTilesTarget.texture
    };
    
    material.uniforms.planetSurfaceColor = {value: this.planetDiffuseColorTarget.texture};
    this.renderer.clear(false, true, true);
    this.renderer.render(this._screenSpaceMesh, camera);
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

  renderPlanetSpheres(withCamera) {
    this.planetSpheres.forEach((mesh, ix) => {
      this.renderer.render(mesh, withCamera);
    });
  }

  calculatePlanetRotation(planet) {
    const northVector = new Vector3(...planet.spatial.north);
    const planetRotation = planet.initialQuaternion.clone();
    const rotationAngle = planet.time || 0;
    const quat = new Quaternion().setFromAxisAngle(northVector, rotationAngle / 1000000000);
    return planetRotation.multiply(quat);

  }

  clamp(v, m, M) {
    return Math.min(M, Math.max(v, m));
  }

 

  determineTextureGPU(planet, withCamera) {
    withCamera.updateProjectionMatrix();
    withCamera.updateMatrixWorld();
    const pixelFovRatio = (withCamera.fov / withCamera.zoom) / NormalFOV;
    const fovPerPixel = withCamera.fov / withCamera.zoom / this.renderer.domElement.height * Math.PI / 180;
    // fovPerPixel *= Math.PI/180; 
    const planetPosition = new Vector3(...planet.spatial.position);
    const cameraPosition = this.globalPosition.position.clone();
    const cameraDir = planetPosition.clone().sub(cameraPosition);
    const distanceToCamera = cameraDir.length();
    cameraDir.normalize();
    const lodCenter = planetPosition
      .clone()
      .add(cameraDir.clone().negate().multiplyScalar(planet.spatial.radius))
      .sub(cameraPosition);
    const northVector = new Vector3(...planet.spatial.north);
    const eastVector = new Vector3().crossVectors(northVector, cameraDir.clone().negate()).normalize().negate();
    const horizonDistance = Math.acos(planet.spatial.radius / distanceToCamera) * planet.spatial.radius;
    const size = 2 * horizonDistance;
    const planetRotation = this.calculatePlanetRotation(planet);
    const planetLODDistance = 0.5 * planet.spatial.radius / pixelFovRatio;
    const normalizedDistance = this.clamp((distanceToCamera - planet.spatial.radius) / planetLODDistance, 1e-6, 1.0);
    const heightBasedLOD = 12.0 - Math.max(0.0, Math.log2(normalizedDistance * 4096.0));

    this.setupUniforms({
      center: lodCenter,
      maxDistance: 0.5 * planet.spatial.radius / pixelFovRatio,
      heightBasedLOD,
      cameraSurfaceHeight: (distanceToCamera - planet.spatial.radius) / horizonDistance,
      cameraDirection: cameraDir.clone().negate().applyQuaternion(planetRotation),
      planetCenter: planetPosition.clone().sub(cameraPosition),
      north: northVector,
      east: eastVector,
      pixelFovRatio: pixelFovRatio,
      fovPerPixel,
      radius: planet.spatial.radius,
      size,
      horizonDistance,
      planetRotation,
      myViewMatrix: new Matrix4().getInverse(withCamera.matrixWorld),
      myProjectionMatrix: withCamera.projectionMatrix.clone(),
      logDepthBufC: 2.0 / ( Math.log(withCamera.far + 1.0 ) / Math.LN2 )
    });
    const texTimes = Date.now();

    this.renderer.setClearAlpha(0.0);
    const __t = Date.now();
    this.renderer.clearTarget(this.planetTilesTarget, true, true, true);
    this.renderer.render(this.lodCalculatorMesh, withCamera, this.planetTilesTarget);
    this.renderer.setClearAlpha(1.0);

    const renderTimeStart = Date.now();
    this.renderer.readRenderTargetPixels(
      this.planetTilesTarget, 0, 0,
      TileSourceMapSize, TileSourceMapSize, 
      this.pixelsSource);

    const renderTimeEnd = Date.now();
    const textures = this.parseTextures(this.pixelsSource.buffer);
    const flattedTextures = this.flattenTextures(textures);

    // console.log(textures.map(t => [t.face, t.lod, t.tile].join(', ')))
    const zeroLodTextures = [
      { s: 0, t: 0, lod: 0, tile: 0, face: 0 },
      { s: 0, t: 0, lod: 0, tile: 0, face: 1 },
      { s: 0, t: 0, lod: 0, tile: 0, face: 2 },
      { s: 0, t: 0, lod: 0, tile: 0, face: 3 },
      { s: 0, t: 0, lod: 0, tile: 0, face: 4 },
      { s: 0, t: 0, lod: 0, tile: 0, face: 5 },
    ];
    return flattedTextures;
  }


  flattenTextures(textureList) {
    if (textureList.length === 0) {
      return [];
    }
    textureList.sort((t, t2) => t2.lod - t.lod);
    let upperLod = textureList[0].lod;
    const levels = [{
      lod: upperLod,
      faceTileMap: new Map
    }];
    
    let levelCounter = 0;
    
    while (textureList.length > 0) {
      const texture = textureList.shift();
      if (texture.lod !== upperLod) {
        const diff = Math.abs(texture.lod - upperLod);
        upperLod = texture.lod;
        for (let k = 0; k < diff; ++k) {
          ++levelCounter;
          levels.push({
            lod: texture.lod + k,
            faceTileMap: new Map,
          });
        }
      }
      if (!levels[levelCounter].faceTileMap.has(texture.face)) {
        levels[levelCounter].faceTileMap.set(texture.face, [new Set, new Set]);
      }
      levels[levelCounter].faceTileMap.get(texture.face)[0].add(texture.tile);
    }
    // let added = [];
    console.log('======================');
    
    
    for (let i = 1; i < levels.length; ++i) {
      const levelToRefill = levels.length > 3 ? 2 : 1;
      if (i > levels.length - levelToRefill - 1) {
        console.log('---------------------------');
        addNeighborTiles(levels[i]);
      }
      const lod = levels[i].lod;
      const div = Math.pow(2, lod);
      if (levels[i].faceTileMap.size === 0) {
        continue;
      }
      for (const [face, [tileSet, halfTileSet]] of levels[i].faceTileMap) {
        const newTileSet = new Set;
        const newHalfTileSet = new Set;
        
        for (const tile of tileSet) {
          const [has1, has2, has3, has4] = checkIntersectionWithUpperLevels(lod, face, tile);

          if (!(has1 || has2 || has3 || has4)) {
            newTileSet.add(tile);
            continue;
          }
          let [J, I] = fromTile(div, tile);
          J = Math.floor(J * 2);
          I = Math.floor(I * 2);

          if (!has1) {
            newHalfTileSet.add(toTile(lod + 1, J, I)); //{ tile: toTile(nextLod, TJ, TI), lod:nextLod, face: texture.face, halfResolution: true })
          }
          if (!has2) {
            newHalfTileSet.add(toTile(lod + 1, J + 1, I)); //{ tile: toTile(nextLod, TJ+1, TI), lod:nextLod, face: texture.face, halfResolution: true })
          }
          if (!has3) {
            newHalfTileSet.add(toTile(lod + 1, J, I + 1)); //{ tile: toTile(nextLod, TJ, TI+1), lod:nextLod, face: texture.face, halfResolution: true })
          }
          if (!has4) {
            newHalfTileSet.add(toTile(lod + 1, J + 1, I + 1)); //{ tile: toTile(nextLod, TJ+1, TI+1), lod:nextLod, face: texture.face, halfResolution: true })
          }
        }
        if (!levels[i - 1].faceTileMap.has(face)) {
          levels[i - 1].faceTileMap.set(face, [new Set, new Set]);
        }
        if (!levels[i].faceTileMap.has(face)) {
          levels[i].faceTileMap.set(face, [new Set, new Set]);
        }
        levels[i - 1].faceTileMap.get(face)[1] = newHalfTileSet;
        levels[i].faceTileMap.get(face)[0] = newTileSet;
      }
    }
    return levels;

    function checkIntersectionWithUpperLevels(lod, face, tile) {
      const div = Math.pow(2, lod);
      let [J, I] = fromTile(div, tile);
      J = Math.floor(J * 2);
      I = Math.floor(I * 2);
      const one = [J, I]; 
      const two = [J + 1, I]; 
      const three = [J, I + 1]; 
      const four = [J + 1, I + 1]; 
      const reference = [one, two, three, four];
      const result = [false, false, false, false];
      for (let l = 0; l < levels.length; ++l) {
        const levelLod = levels[l].lod;
        if (levelLod == lod) {
          break;
        }
        const levelDiv = Math.pow(2, levelLod);
        const diffDiv = Math.pow(2, levelLod - (lod + 1));
        if (!levels[l].faceTileMap.has(face)) {
          continue;
        }
        // const arr = levels[l].faceTileMap.get(face);
        
        // if(!arr) debugger;
        //if(arr.length !== 2) throw new Error("WTF");
        const [tileSet, halfTileSet] = levels[l].faceTileMap.get(face);
        // const tileSet = arr[0];
        // const halfTileSet = arr[1];
        for (const tile of halfTileSet) {
          const [j, i] = fromTile(levelDiv, tile);
          for (let k = 0; k < result.length; ++k) {
            const ref = reference[k];
            const inHere = (Math.floor(j / diffDiv) === ref[0]) && 
                           (Math.floor(i / diffDiv) === ref[1]);
            result[k] = result[k] || inHere;
          }
        }
        for (const tile of tileSet) {
          const [j, i] = fromTile(levelDiv, tile);
          for (let k = 0; k < result.length; ++k) {
            const ref = reference[k];
            const inHere = (Math.floor(j / diffDiv) === ref[0]) && 
                           (Math.floor(i / diffDiv) === ref[1]);
            result[k] = result[k] || inHere;
          }
        }
      }
      return result;
    }

    function fromTile(div, tile) {
      const TJ = Math.floor(tile / div);
      const TI = Math.floor(tile % div);
      return [TJ, TI];
    }

    function checkIntersection(texture) {
      for (let c = 0 ; c < added.length; ++c) {
        const text = added[c];
        const div = Math.pow(2, text.lod);
        let j = Math.floor(text.tile / div);
        let i = Math.floor(text.tile % div);
        let lod = text.lod;
        while (lod >= texture.lod) {
          --lod;
          j /= 2;
          i /= 2;
          const nd = Math.pow(2, lod);
          const T = Math.floor(j) * nd + Math.floor(i);
          // console.log(T, texture.tile);
          if (T === texture.tile) {
            throw new Error('gotcha');
          }
        }
      }

    }
    function addNeighborTiles(level) {
      // return console.warn('rewrite add neighbor tiles please');

      const faceTileMap = level.faceTileMap;
      const lod = level.lod;
      const div = Math.pow(2, lod);
      for (const face of faceTileMap.keys()) {
        const set = faceTileMap.get(face)[0];
        const copy = new Set(set);

        for (const tile of copy) {
          const [j, i] = fromTile(div, tile);
          // const i = tile % div;
          set.add(toTile(lod, j + 1, i - 1));
          set.add(toTile(lod, j + 1, i));
          set.add(toTile(lod, j + 1, i + 1));

          set.add(toTile(lod, j - 1, i - 1));
          set.add(toTile(lod, j - 1, i));
          set.add(toTile(lod, j - 1, i + 1));

          set.add(toTile(lod, j, i + 1));
          set.add(toTile(lod, j, i - 1));
          // console.log(lod, div, j, i);
        }
        console.log(set, copy);
        //for(let tile of set){
        //  const s = Math.floor(tile / div) / div; 
        //  const t = (tile % div) / div;
        //  const surrogate = {
        //    lod, 
        //    // s,t,
        //    tile,
        //    face,
        //    isNeighbor: true
        //  };
        //  level.push(surrogate);
        //}
      }
    }

    function toTile(lod, J, I) {
      const div = Math.pow(2, lod);
      const max = div - 1;
      const min = 0;
      return Math.max(min, Math.min(J, max)) * div + Math.max(min, Math.min(I, max));
    }
    /*
    hasIntersectionWithUpperLevel(currentLevel, face, j, i){
      const level = currentLevel - 1;
      for(let c = 0; c < levels[level].length; ++i) {
        const T = levels[level][c];

      }
    }
*/
    function pressTexturesToLowerLevel(i) {
      const level = i - 1;
      if (levels[level].length === 0) {
        return;
      }
      const faceTileSet = new Map;
      const lod = levels[level][0].lod;
      while (levels[level].length > 0) {
        const texture = levels[level].shift();
        const div = Math.pow(2, texture.lod);
        let TJ = Math.floor(texture.tile / div);
        let TI = Math.floor(texture.tile % div);
        TJ = Math.floor(TJ / 2);
        TI = Math.floor(TI / 2);
        const tile = toTile(texture.lod - 1, TJ, TI);
        if (!faceTileSet.has(texture.face)) {
          faceTileSet.set(texture.face, new Set);
        }
        faceTileSet.get(texture.face).add(tile);
      }
      for (const f of faceTileSet.keys()) {
        const s = faceTileSet.get(f);
        for (const t of s) {
          const surrogate = {
            lod: lod - 1, 
            tile: t,
            face: f,
            isSurrogate: true
          };
          // console.log("--", f, t, lod-1);
          levels[i].push(surrogate);
        }
      }
    }

    function hasAtUpperLevel(curLevel, face, lod, j, i) {
      const level = curLevel - 1;
      const div = Math.pow(2, lod);
      const tile = toTile(lod, j, i);
      for (let c = 0; c < levels[level].length; ++c) {
        const T = levels[level][c];

        if (T.tile == tile && T.face == face) {
          levels[level].splice(c, 1);
          return true;
        }
      }
      return false;
    }
  }

  superTextureRendering(planet, withCamera) {
    const globalPosition = this.globalPosition.position.clone();
    const planetRotation = this.calculatePlanetRotation(planet);
    const planetPosition = new Vector3(...planet.spatial.position).sub(globalPosition);
    const pixelFovRatio = (withCamera.fov / withCamera.zoom) / NormalFOV;
    const textures = this.superTextureRenderer.getTexturesDescriptorAt(planet, globalPosition, planetRotation, pixelFovRatio);
    textures.map(td => {
      const t = this.superTextureRenderer.getTexture(td);
      const ufs = this.lodMesh.material.uniforms;
      ufs.position = {value: planetPosition};
      ufs.rotation = {value: planetRotation};
      ufs.heightMap = {value: t};
      this.renderer.clearTarget(this.planetDiffuseColorTarget, true, true, true);
      this.renderer.render(this.lodMesh, withCamera, this.planetDiffuseColorTarget);
      debugger;
    });
  }


  renderLOD(planet, withCamera, planetProperties) {

    // let textures = this.determineTextureGPU(planet, withCamera, planetProperties);
    const cameraPosition = this.globalPosition.position.clone();
    const planetRotation = this.calculatePlanetRotation(planet);
    const planetCenter = new Vector3(...planet.spatial.position).sub(cameraPosition);
    withCamera.updateProjectionMatrix();
    withCamera.updateMatrixWorld();
    const pixelFovRatio = (withCamera.fov / withCamera.zoom) / NormalFOV;
    const fovPerPixel = withCamera.fov / withCamera.zoom / this.renderer.domElement.height * Math.PI / 180;
    // fovPerPixel *= Math.PI/180; 
    const planetPosition = new Vector3(...planet.spatial.position);
    const cameraDir = planetPosition.clone().sub(cameraPosition);
    const distanceToCamera = cameraDir.length();
    cameraDir.normalize();
    const lodCenter = planetPosition
      .clone()
      .add(cameraDir.clone().negate().multiplyScalar(planet.spatial.radius))
      .sub(cameraPosition);
    const northVector = new Vector3(...planet.spatial.north);
    const eastVector = new Vector3().crossVectors(northVector, cameraDir.clone().negate()).normalize().negate();
    const horizonDistance = Math.acos(planet.spatial.radius / distanceToCamera) * planet.spatial.radius;
    const size = 2 * horizonDistance;
    const planetLODDistance = 0.5 * planet.spatial.radius / pixelFovRatio;
    const normalizedDistance = this.clamp((distanceToCamera - planet.spatial.radius) / planetLODDistance, 1e-6, 1.0);
    const heightBasedLOD = 12.0 - Math.max(0.0, Math.log2(normalizedDistance * 4096.0));

    this.setupUniforms({
      center: lodCenter,
      maxDistance: 0.5 * planet.spatial.radius / pixelFovRatio,
      heightBasedLOD,
      cameraSurfaceHeight: (distanceToCamera - planet.spatial.radius) / horizonDistance,
      cameraDirection: cameraDir.clone().negate().applyQuaternion(planetRotation),
      planetCenter,
      north: northVector,
      east: eastVector,
      pixelFovRatio: pixelFovRatio,
      fovPerPixel,
      radius: planet.spatial.radius,
      size,
      horizonDistance,
      planetRotation,
      myViewMatrix: new Matrix4().getInverse(withCamera.matrixWorld),
      myProjectionMatrix: withCamera.projectionMatrix.clone(),
      logDepthBufC: 2.0 / ( Math.log(withCamera.far + 1.0 ) / Math.LN2 )
    });
    withCamera.updateProjectionMatrix();
    withCamera.updateMatrixWorld();
    withCamera._viewMatrix = new Matrix4().getInverse(withCamera.matrixWorld);
    withCamera._fovPerPixel = withCamera.fov / withCamera.zoom / this.renderer.domElement.height * Math.PI / 180;
    withCamera._fovPerPixel = Math.tan(withCamera._fovPerPixel / 2.0) * 2.0;
    const textures = this.tileRetriver.retrieveTileFromCamera(withCamera, {
      radius: planet.spatial.radius,
      planetCenter,
      planetRotation
    });
    this.renderer.clearTarget(this.planetDiffuseColorTarget, true, true, true);

    if (!textures) {
      return null;
    }
    const renderer = this.renderTexturesWithLOD(planet, withCamera, planetProperties);
    for (const [lod, item] of textures) {
      renderer(item);
    }
    // textures.forEach();

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
    if (keyCode == 106) {
      ++this.__zz;
    }
    if (keyCode == 111) {
      --this.__zz;
    }
    if (keyCode == 107) {
      ++this.__ww;
    }
    if (keyCode == 109) {
      --this.__ww;
    }
  }

  findClosestTileInScreenSpace(planetPosition, viewProjectionMatrix) {
    const center = planetPosition.clone().normalize();
    center.applyMatrix4(viewProjectionMatrix);
    const screenSegments = [
      [[-1, 1], [-1, -1]],
      [[-1, 1], [1, 1]],
      [[1, 1], [1, -1]],
      [[-1, -1], [1, -1]]
    ];
    const intersects = [];
    for (let i = 0; i < screenSegments.length; ++i) {
      const segment = screenSegments[i];
      const [p1, p2] = segment;
      const d = [p2[0] - p1[0], p2[1] - p1[1]];
      const delta = [0 - p1[0], 0 - p1[1]];
      const K = this.kross(d, [center.x, center.y]);
      const t = this.kross(delta, d) / K;
      if ((t < 0) || !isFinite(t) || t > 1.0) {
        continue;
      }
      intersects.push({t, p: [center.x * t, center.y * t]});
    }
    let intersect;
    if (intersects.length == 0) {
      return {p: [center.x, center.y]};
    } else {
      if (intersects.length > 1) {
        intersects.sort((i1, i2) => i1.t - i2.t);
      }
      return intersects[0];
    }
  }

  initTextureCaches(to) {
    to.texturesCache = {};
    this.textureTypes.forEach(t => to.texturesCache[t] = [[], [], [], [], [], [], []]);
  }

  findTileCenter(planet, face, tile, lod) {
    const division = Math.pow(2, lod);
    const s = 0.5 / division; 
    const t = 0.5 / division;
    const S = Math.floor(tile / division) / division;
    const T = (tile % division) / division;
    const cameraPosition = this.globalPosition.position.clone();


    const n = new Vector3(...stToNormal(S + s, T + t, face)).normalize();
    const p = n
      .multiplyScalar(planet.spatial.radius)
      .add(new Vector3(...planet.spatial.position))
      .sub(cameraPosition);
  }


  setupLodMaterialUniforms(material, planet, params) {
    const {s, t, lod, tile, face, tileCoords } = params;
    const division = Math.pow(2, lod);
    
    for (let i = 0; i < this.textureTypes.length; ++i) {
      const t = this.surfaceRenderer.getTexture(planet, this.textureTypes[i], params);
      material.uniforms[this.textureTypes[i] + 'Map'] = {value: t};
    } 

   
    material.uniforms.face = {value: face};
    material.uniforms.lod = {value: lod};
    material.uniforms.tile = {value: tile};
    material.uniforms.tileCoordsJ = {value: tileCoords.x};
    material.uniforms.tileCoordsI = {value: tileCoords.y};
    material.uniforms.halfResolution = {value: params.halfResolution};
    material.uniforms.fface = {value: face};
    material.wireframe = true;
    material.side = THREE.DoubleSide;

  }

  renderTexturesWithLOD(planet, camera) {
    this.noMoreRendering = false;
    return params => {
      const lod = params.lod;
      for (const [face, {tiles, halfTiles}] of params.faceTileMap) {
        this.lodMesh.material = this.material;
        for (const [tile, tileCoords] of tiles) {
          
          this.setupLodMaterialUniforms(this.material, planet, {face, lod, tile, tileCoords, halfResolution: false});
          this.renderer.render(this.lodMesh, camera, this.planetDiffuseColorTarget);
        }
        this.lodMeshHalf.material = this.material;
        if (!halfTiles) {
          return;
        }
        for (const tile of halfTiles) {
          this.setupLodMaterialUniforms(this.material, planet, {face, lod, tile, halfResolution: true});
          this.renderer.render(this.lodMeshHalf, camera, this.planetDiffuseColorTarget);
        }
      }
    };
  }

  prepareTexture(planet, params) {
    const {textureType, lod, face, tile} = params;
    if (textureType === 'specular' || textureType === 'color'
    // || textureType === 'normal'
    ) {
      return;
    }
    const t = this.surfaceRenderer.getTexture(planet, params.textureType, params);
    planet.texturesCache[textureType][face][lod].set(tile, t);
  }

  setupUniforms(values) {
    for (const key in values) {
      this.material.uniforms[key] = {value: values[key]};
      this.lodCalculator.uniforms[key] = {value: values[key]};
    }
    // this.lodCalculator.uniforms.calculateHeight = {value: 0};
    this.material.needsUpdate = true;
    this.lodCalculator.needsUpdate = true;
  }

  setupArray() {
  }

  renderAllTextures() {
  }

  prepareArrays() {
    const lowLodGeometry = getLodGeometry(50);
    const highLodGeometry = getLodGeometry(256);
    const halfLodGeometry = getLodGeometry(128);
    this.lodMesh = new Mesh(highLodGeometry, this.material);
    this.lodMeshHalf = new Mesh(halfLodGeometry, this.material);
    this.lodMesh.frustumCulled = false;
    this.lodMeshHalf.frustumCulled = false;
    this.lodCalculatorMesh = new Mesh(lowLodGeometry, this.lodCalculator);
  }


  prepareProgram() {
    this.material = new LODMaterial();
    this.lodCalculator = new LodCalculatorMaterial();
  }
}
