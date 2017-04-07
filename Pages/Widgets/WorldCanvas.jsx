import {Camera} from '../../Camera.js';
import {CanvasBase} from '../../Canvas.jsx'
import {Mesh} from 'three/src/objects/Mesh';
import {Vector3} from 'three/src/math/Vector3';
import {Quaternion} from 'three/src/math/Quaternion';
import {Textures} from '../../Utils/TextureCache.js';
import {PerspectiveCamera} from 'three/src/cameras/PerspectiveCamera.js';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {BoxBufferGeometry} from 'three/src/geometries/BoxBufferGeometry';
import {SphereBufferGeometry} from 'three/src/geometries/SphereBufferGeometry';
import {getCubemap} from '../../math/Graphical/CubemapCreator.js';
import {CubeMapMaterial} from '../../materials/PlanetaryMaterial.jsx';
import {PlanetRenderer} from '../../renderers/PlanetRenderer.js';
import planets from '../../planets.json';

let ix = 0;
export class WorldCanvas extends CanvasBase{
  constructor(props){
    super(props)
  }

  componentDidMount(){
    super.componentDidMount();
    // assume, our pposition for now is anywhere 100 above surface of first planet
    console.log(planets);
    console.log("this.nodeREct", this.nodeRect);
    let fov = 45,
      aspect = this.nodeRect.width / this.nodeRect.height,
      near = 0.1,
      far = 1000;

    this.camera = new PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.z = -10;

    this.cameraHandler = new Camera(this.camera, this.refs.node);

    let planet = planets.planets[0];
    let p = new Vector3(...planet.spatial.position);
    let n = new Vector3(0,0,1);

    p.add(n.multiplyScalar(planet.spatial.radius + 100000));
    this.globalCameraOpts = {position: new Vector3, lookAt: new Vector3}
    this.planetRenderer = new PlanetRenderer(this.camera,this.renderer, planets, this.globalCameraOpts);
    this.startLoop(this.cameraChange.bind(this));
  }

  cameraChange(ts){
    let radius = 39e6;
    let planet = planets.planets[1];
    let pos = new Vector3(...planet.spatial.position);
    let v1 = new Vector3(1.0, 0, 0);
    let v2 = new Vector3(0.0, 1, 0);
    let lookAt = pos.clone();

    let a  = ts / 10000;
    pos.add(v1.multiplyScalar(Math.cos(a)*radius));
    pos.add(v2.multiplyScalar(Math.sin(a)*radius));
    
    this.globalCameraOpts.position.copy(pos);
    this.globalCameraOpts.lookAt.copy(lookAt);
  }

  setupCamera(){
  }

  componentWillUnmount(){
    super.componentWillUnmount();
    this.stopLoop();
  }

  prerender(){
    this.planetRenderer.render();
    return [false, true, true];
  }

  renderScene(){
    return []
  }
}
