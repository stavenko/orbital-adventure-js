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

const colors = [[0.5,0.5,0], [0.0, 1.0, 0.0], [0.3, 0.7, 1]];

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

    geom.setIndex(new BufferAttribute(ind, 1));
    this.atmoshpereMaterial = new RawShaderMaterial({
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
      fragmentShader: require('../shaders/atmosphereShader.glsl'),
      transparent: true

    });
    this.atmoshpereMaterial.needsUpdate = true;
    let mesh = new Mesh(geom, this.atmoshpereMaterial);
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
    sorted.forEach((planet, ix)=>{
      let mesh = this.planetSpheres[ix];
      let planetProperties = {}
      this.renderLOD(planet, camera, planetProperties);
      this.renderAtmospehere(planet, camera, planetProperties);
      this.renderer.clear(false, true, true);
    })
  }

  renderAtmospehere(planet, camera, planetProperties){
    let cameraPosition = this.globalPosition.position.clone();
    camera.updateProjectionMatrix();
    let projectionInverse = new Matrix4().getInverse(camera.projectionMatrix);
    let viewMatrix = new Matrix4().getInverse(camera.matrixWorld);
    let atmosphereTextures = this.worldManager.getPlanetAtmosphereTextures(planet)
    let width = this.renderer.domElement.width;
    let height = this.renderer.domElement.height;
    let planetPosition = planetProperties.cameraRelatedPosition; 

    let r = planetPosition.length();
    let ur = Math.sqrt((r - planet.spatial.radius)/1000.0/planet.phisical.atmosphereHeight)

    let propUniforms = {};

    let param = Date.now()%10000;
    let spatial = planet.spatial;


    this.atmoshpereMaterial.uniforms.resolution =  {value: new Vector2(width, height)};
    this.atmoshpereMaterial.uniforms.ttimeVar= {value: param/1000};
    this.atmoshpereMaterial.uniforms.planetPosition= {value: planetPosition.clone()};
    this.atmoshpereMaterial.uniforms.radius= {value: planet.spatial.radius};
    this.atmoshpereMaterial.uniforms.atmosphereHeight= {value: planet.phisical.atmosphereHeight};
    this.atmoshpereMaterial.uniforms.viewMatrix= {value: viewMatrix};
    this.atmoshpereMaterial.uniforms.viewInverseMatrix= {value: camera.matrixWorld.clone()};
    this.atmoshpereMaterial.uniforms.projectionInverse= {value: projectionInverse};
    for(let k in atmosphereTextures){
      this.atmoshpereMaterial.uniforms[k] = {value:atmosphereTextures[k]}
    }

    //this.atmoshpereMaterial.needsUpdate = true;

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
