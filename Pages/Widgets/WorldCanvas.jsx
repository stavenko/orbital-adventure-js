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
import {WorldManager} from '../../materials/TextureManager.jsx';
import planets from '../../planets.json';

let ix = 0;

const worldProps = {
  star: {
    color: [1,1,0.9],
    position: [0,0,0],
    mass: 2e30,
    radius: 1.4e9
  },
  planets: [
    {
      "phisical":{
        "density": 1,
        "mass": 100
      },
      "spatial":{
        "position": [0,0,13e9],
        "north":[0,1,0],
        "radius": 6.3781e6
      }
    },
    {
      "phisical":{
        "density": 1,
        "mass": 100
      },
      "spatial":{
        "position": [6.3781e6*3,0,13e9],
        "north":[0,1,0],
        "radius": 6.3781e6*0.5
      }
    } 
  ]
  
}

export class WorldCanvas extends CanvasBase{
  constructor(props){
    super(props)
  }

  componentDidMount(){
    super.componentDidMount();
    this.renderingFunction = ()=>{};
    // assume, our position for now is anywhere 100 above 
    // surface of first planet
    // console.log(planets);
    // console.log("this.nodeREct", this.nodeRect);
    let fov = 45,
      aspect = this.nodeRect.width / this.nodeRect.height,
      near = 0.1,
      far = 1000;


    this.camera = new PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.z = -10;

    this.cameraHandler = new Camera(this.camera, this.refs.node);

    this.worldManager = new WorldManager;
    this.worldManager.getWorldList(planets=>{
      let hasWorld = planets && planets.length > 0;
      if(!hasWorld)
        return this.worldManager.createWorld(worldProps,()=>{
          this.worldManager.getWorldList(planets=>{
            let hasWorld = planets && planets.length > 0;
            if(!hasWorld) return console.error("Some error happend - backend is not responding");
            // Asuume there's only one for now
            this.startWorld(planets[0]);

          })
        });

      // Asuume there's only one for now
      this.startWorld(planets[0]);
    })

  }

  

  startWorld(planets){
    let planet = planets.planets[0];
    let p = new Vector3(...planet.spatial.position);
    let n = new Vector3(0,0,1);
    p.add(n.multiplyScalar(planet.spatial.radius + 100000));
    this.globalCameraOpts = {position: new Vector3, lookAt: new Vector3}
    this.planetRenderer = new PlanetRenderer(this.camera,this.renderer, planets, this.globalCameraOpts, this.worldManager);
    this.startLoop(this.cameraChange.bind(this));
    this.renderingFunction = ()=>{
      this.planetRenderer.render();
    }
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
    this.renderingFunction();
    return [false, true, true];
  }

  renderScene(){
    return []
  }
}
