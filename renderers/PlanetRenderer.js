import {Quaternion} from 'three/src/math/Quaternion';
import {Matrix4} from 'three/src/math/Matrix4';
import {Vector3} from 'three/src/math/Vector3';
import {Color} from 'three/src/math/Color';
import {Mesh} from 'three/src/objects/Mesh';
import {LODMaterial} from '../materials/PlanetaryMaterial.jsx';
import {getLodGeometry} from '../math/Geometry.js';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {SphereBufferGeometry} from 'three/src/geometries/SphereBufferGeometry';

const colors = [[0.5,0.5,0], [0.0, 1.0, 0.0], [0.3, 0.7, 1]];

export class PlanetRenderer{
  constructor(camera, renderer, planets, globalPosition){
    this.camera = camera;
    this.renderer = renderer;
    this.prepareProgram();
    this.prepareArrays();
    this.planets = planets;
    this.globalPosition = globalPosition;
    this.planetSpheres = planets.planets.map((planet,ix)=>{
      let {spatial} = planet;
      let geometry = new SphereBufferGeometry(spatial.radius, 100,100);
      let mesh = new Mesh(geometry, new MeshBasicMaterial({color: new Color(...colors[ix])}));
      mesh.position.set(...spatial.position);
      mesh.updateMatrix();
      mesh.updateMatrixWorld();
      return mesh;
    });
  }

  clearing(){

  }

  render(){
    this.clearing();
    let c = this.camera.clone();
    c.position.copy(this.globalPosition);
    c.updateMatrix();
    c.updateMatrixWorld();
    this.renderPlanets(c);
    //this.renderPlanetSpheres(c)
  }

  renderPlanets(camera){
    this.planets.planets.forEach((planet, ix)=>{
      let mesh = this.planetSpheres[ix];
      this.setupClipping(planet, camera);
      this.renderSphere(mesh,camera);
      this.renderLOD(planet, camera);
      this.renderer.clearDepth();
    })
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
      this.renderer.clearDepth();
    })
  }


  renderLOD(planet, withCamera){

    let {radius, position, north} = planet.spatial;

    let planetPosition = new Vector3(...position);
    let cameraDir = planetPosition.clone().sub(withCamera.position); 
    let distanceToCamera =cameraDir.length();
    cameraDir.normalize();

    let lodCenter = planetPosition.clone().add(cameraDir.negate().multiplyScalar(radius));

    // let distanceToCamera = planetPosition.distanceTo(withCamera.position);

    let size = Math.acos(radius / distanceToCamera) * 2 * radius;

    let northVector = new Vector3(...north);
    northVector.applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0,0,1), 0.1));
    let eastVector = new Vector3().crossVectors(northVector, cameraDir ).normalize();

    //cubemap lookup
    /*
 major axis
      direction     target	            		       sc     tc    ma
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

    this.lodMesh.position.copy(lodCenter);
    this.lodMesh.updateMatrix();
    this.lodMesh.updateMatrixWorld();

    this.setupUniforms({
      center: lodCenter,
      planetCenter: planetPosition,
      north: northVector,
      east: eastVector,
      radius,
      size,
      someColor: new Vector3(1,0,0),
      viewInverseM:  new Matrix4().getInverse(withCamera.matrixWorld),
      viewM:  withCamera.matrixWorld.clone(),
      modelM:  this.lodMesh.matrixWorld.clone(),
      projectionM:  withCamera.projectionMatrix.clone()
    })
    debugger;
    // this.lodMesh.material.wireframe = true;
    this.renderer.render(this.lodMesh, withCamera);
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
