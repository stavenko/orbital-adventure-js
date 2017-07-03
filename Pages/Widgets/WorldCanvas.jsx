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
function noiseSeed(){
  let seed = [];
  for(let i =0; i< 256; ++i){
    seed[i] = Math.floor(Math.random()*256)
  }
  return seed;
}

function generateUUID(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

const worldProps = {
  star: {
    color: [1,1,0.9],
    position: [0,0,0],
    mass: 2e30,
    radius: 1.4e9,
    angularRadius: 0.00935 / 2.0,
    irradiance: [
      1.11776, 1.14259, 1.01249, 1.14716, 1.72765, 1.73054, 1.6887, 1.61253,
      1.91198, 2.03474, 2.02042, 2.02212, 1.93377, 1.95809, 1.91686, 1.8298,
      1.8685, 1.8931, 1.85149, 1.8504, 1.8341, 1.8345, 1.8147, 1.78158, 1.7533,
      1.6965, 1.68194, 1.64654, 1.6048, 1.52143, 1.55622, 1.5113, 1.474, 1.4482,
      1.41018, 1.36775, 1.34188, 1.31429, 1.28303, 1.26758, 1.2367, 1.2082,
      1.18737, 1.14683, 1.12362, 1.1058, 1.07124, 1.04992
    ] 
  },
  planets: [
    /*
    {
      "phisical":{
        "density": 1,
        "mass": 100,
        'atmosphereHeight': 60,
        'radius': 6378.1,
        'HM': 1.2,
        'HR': 8.0,
        'betaMSca': [4e-3, 4e-3, 4e-3],
        'betaR' : [5.8e-3, 1.35e-2, 3.31e-2]
      },
      "spatial":{
        "position": [0,0,13e9],
        "north":[0,1,0],
        "radius": 6.3781e6,
        "rotationSpeed": Math.PI/8
      }
    },
    */
    {
      table: noiseSeed(),
      uuid: generateUUID(),
      phisical:{
        density: 1,
        mass: 100,
        atmosphereHeight: 60e3,
        radius: 6378.1e3,
        dobsonUnit: 2.687e20,
        maxOzoneNumberDensity: 300 * 2.687e20 / 15000.0,
        constantSolarIrradiance: 1.5,
        rayleigh: 1.24062e-6,
        rayleighScaleHeight: 8000,
        mieScaleHeight: 1200,
        mieAngstromAlpha: 0.0,
        mieAngstromBeta: 5.328e-3,
        mieSingleScatteringAlbedo: 0.9,
        miePhaseFunctionG: 0.8,
        groundAlbedo: 0.1,
        has_ozone: true,
        ozoneCrossSection:[
          1.18e-27, 2.182e-28, 2.818e-28, 6.636e-28, 1.527e-27, 2.763e-27, 5.52e-27,
          8.451e-27, 1.582e-26, 2.316e-26, 3.669e-26, 4.924e-26, 7.752e-26, 9.016e-26,
          1.48e-25, 1.602e-25, 2.139e-25, 2.755e-25, 3.091e-25, 3.5e-25, 4.266e-25,
          4.672e-25, 4.398e-25, 4.701e-25, 5.019e-25, 4.305e-25, 3.74e-25, 3.215e-25,
          2.662e-25, 2.238e-25, 1.852e-25, 1.473e-25, 1.209e-25, 9.423e-26, 7.455e-26,
          6.566e-26, 5.105e-26, 4.15e-26, 4.228e-26, 3.237e-26, 2.451e-26, 2.801e-26,
          2.534e-26, 1.624e-26, 1.465e-26, 2.078e-26, 1.383e-26, 7.105e-27
        ]
      },
      "spatial":{
        "position": [6.3781e6*3,0,13e9],
        "north":[0,0.707,0.707],
        "rotationSpeed": 2*Math.PI/(24*60*60),
        "radius": 6.3781e6
      }
    } 
  ]
  
}

export class WorldCanvas extends CanvasBase{
  constructor(props){
    super(props)
    this._showFaces = [true, true, true, true, true, true]
    
  }

  speedLookup(height){
    if(height < 5) return 200;
    if(height < 10) return 800;
    if(height < 20) return 1600;
    if(height < 60) return 7700;
    if(height < 200) return 10000;
    if(height < 1000) return 20000;
    if(height < 10000) return 200000;
     return 2000000;


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
    this.startWorld(worldProps);
    /*
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
      })*/

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

    // let spdMul = Math.pow(minDistance / (planetRadius*3),2);

    let x = new Vector3(1,0,0);
    let y = new Vector3(0,1,0);
    let z = new Vector3(0,0,1);
    let a = Math.PI / 180;
    let speed = this.speedLookup((minDistance-planetRadius)/1000);
    console.log("minDistance: ", (minDistance-planetRadius)/1000, speed);

    console.log(evt.keyCode);
    if(evt.keyCode >= 48 && evt.keyCode <= 57) {
      let btn = evt.keyCode - 49;
      this._showFaces[btn] = !this._showFaces[btn];
      this.planetRenderer.setVisibleFaces(this._showFaces);

      evt.preventDefault();
    }

    if([106,107, 109,111].indexOf(evt.keyCode) != -1){
      this.planetRenderer.doSomethingWithInput(evt.keyCode);
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
    if(planets.length > 1)
      this.setPosition(planets.planets[1]);
    else{
      this.setPosition(planets.planets[0]);
    }
    this.planetRenderer = new PlanetRenderer(this.camera,this.renderer, planets, this.globalCameraOpts, this.worldManager);
    this.startLoop(this.cameraChange(planets));
    this.renderingFunction = ()=>{
      this.planetRenderer.render();
    }
  }

  setPosition(planet){
    let maxRadius = 15e6;//planet.spatial.radius + 1000e3;
    let minRadius = 15e6;//planet.spatial.radius + 100e3 ;

    let pos = new Vector3(...planet.spatial.position);
    let radius = planet.spatial.radius;
    let v1 = new Vector3(1.0, 0, 0);
    let v2 = new Vector3(0.0, 0, 1);
    let v3 = new Vector3(0.0, 1, 0);
    let lookAt = pos.clone();

    let pi2 = Math.PI * 2;
    let a  = 0;
    let phi = a / pi2;
    phi = a - (Math.floor(phi) * pi2);
    let t = Math.abs(phi/pi2 - 0.5)*2;

    // let radius = maxRadius * t + (1-t)*minRadius;

    // pos.add(v1.multiplyScalar(Math.cos(a)*radius));
    // pos.add(v2.multiplyScalar(Math.sin(a)*radius));
    pos.add(v3.multiplyScalar(radius + 500.0));
    
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
