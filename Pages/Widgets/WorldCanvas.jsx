import {Camera} from '../../Camera.js';
import {CanvasBase} from '../../Canvas.jsx'
import {Mesh} from 'three/src/objects/Mesh';
import {Object3D} from 'three/src/core/Object3D';
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
        "radius": 6.3781e6,
        "rotationSpeed": Math.PI/8
      }
    },
    {
      "phisical":{
        "density": 1,
        "mass": 100
      },
      "spatial":{
        "position": [6.3781e6*3,0,13e9],
        "north":[0,0.707,0.707],
        "rotationSpeed": Math.PI/7,
        "radius": 6.3781e6*0.5
      }
    } 
  ]
  
}

export class WorldCanvas extends CanvasBase{
  constructor(props){
    super(props)
    this._showFaces = [true, true, true, true, true, true]
  }

  componentDidMount(){
    super.componentDidMount();
    this.renderingFunction = ()=>{};
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

    document.addEventListener('keydown',this.keyDown.bind(this));


  }

  keyDown(evt){
    let minDistance = Infinity;
    let planetRadius = null;
    this.planets.planets.forEach(({spatial})=>{
      let distance = new Vector3(...spatial.position).distanceTo(this.globalCameraOpts.position);
      if(distance < minDistance){
        minDistance = distance;
        planetRadius = spatial.radius;
      }
    })

    let spdMul = Math.pow(minDistance / (planetRadius*3),2);

    let x = new Vector3(1,0,0);
    let y = new Vector3(0,1,0);
    let z = new Vector3(0,0,1);
    let a = Math.PI / 180;
    let speed = 1e5 * spdMul;

    // console.log(evt.keyCode);
    if(evt.keyCode >= 48 && evt.keyCode <= 57) {
      let btn = evt.keyCode - 49;
      this._showFaces[btn] = !this._showFaces[btn];
      this.planetRenderer.setVisibleFaces(this._showFaces);

      evt.preventDefault();
    }

    if(evt.keyCode == 84){
      this.planetRenderer.setFaceRendering()
    }

    if(evt.keyCode == 38){
      this.turnCamera(x, a)
      evt.preventDefault();
    }
    if(evt.keyCode == 40){
      this.turnCamera(x, -a)
      evt.preventDefault();
    }

    if(evt.keyCode == 37){
      this.turnCamera(y, a)
      evt.preventDefault();
    }
    if(evt.keyCode == 39){
      this.turnCamera(y, -a)
      evt.preventDefault();
    }

    if(evt.keyCode == 87){
      this.moveCamera(z.clone().negate(), speed )
      evt.preventDefault();
    }

    if(evt.keyCode == 83){
      this.moveCamera(z, speed )
      evt.preventDefault();
    }

    if(evt.keyCode == 81){
      this.moveCamera(x.clone().negate(), speed )
      evt.preventDefault();
    }

    if(evt.keyCode == 69){
      this.moveCamera(x, speed )
      evt.preventDefault();
    }

  }
  

  turnCamera(axis, angle){
    let q = new Quaternion().setFromAxisAngle(axis, angle);
    this.globalCameraOpts.quaternion.multiply(q);
  }

  moveCamera(vector, speed){
    let diff = vector.clone().applyQuaternion(this.globalCameraOpts.quaternion);
    diff.multiplyScalar(speed);
    this.globalCameraOpts.position.add(diff);

  }


  startWorld(planets){
    this.planets = planets;
    let _planets = planets.planets;
    for(let i = 0; i < _planets.length; ++i){
      let planet = _planets[i];
      planet.initialQuaternion = new Quaternion();
      let axis = new Vector3(0,1,0).cross(new Vector3(...planet.spatial.north))
      let angle = Math.asin(axis.length());
      if(angle == 0) continue;
      axis.normalize();
      planet.initialQuaternion.setFromAxisAngle(axis, angle);
      planet.time = 0;
    }
    let planet = planets.planets[0];
    let p = new Vector3(...planet.spatial.position);
    let n = new Vector3(0,0,1);
    p.add(n.multiplyScalar(planet.spatial.radius + 100000));
    this.globalCameraOpts = {
      position: new Vector3, 
      lookAt: new Vector3, 
      quaternion: new Quaternion
    }
    this.setPosition(planets.planets[1]);
    this.planetRenderer = new PlanetRenderer(this.camera,this.renderer, planets, this.globalCameraOpts, this.worldManager);
    this.startLoop(this.cameraChange(planets));
    this.renderingFunction = ()=>{
      this.planetRenderer.render();
    }
  }

  setPosition(planet){
    let maxRadius = 39e6;//planet.spatial.radius + 1000e3;
    let minRadius = 39e6;//planet.spatial.radius + 100e3 ;

    let pos = new Vector3(...planet.spatial.position);
    let v1 = new Vector3(1.0, 0, 0);
    let v2 = new Vector3(0.0, 0, 1);
    let lookAt = pos.clone();

    let pi2 = Math.PI * 2;
    let a  = 0;
    let phi = a / pi2;
    phi = a - (Math.floor(phi) * pi2);
    let t = Math.abs(phi/pi2 - 0.5)*2;

    let radius = maxRadius * t + (1-t)*minRadius;

    pos.add(v1.multiplyScalar(Math.cos(a)*radius));
    pos.add(v2.multiplyScalar(Math.sin(a)*radius));
    
    let o = new Object3D;
    o.position.copy(pos);
    o.lookAt(new Vector3(...planet.spatial.position))
    this.globalCameraOpts.position.copy(pos);
    this.globalCameraOpts.quaternion.copy(o.quaternion.inverse());

  }

  cameraChange(planets){
    return ts=>{
      let _planets = this.planets.planets;
      for(let i = 0; i < _planets.length; ++i){
        let planet = _planets[i];
        planet.time = ts;
      }
    }
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
