import React from 'react';
// import ReactDOM from 'react-dom';
// import {Scene} from 'three/src/scenes/Scene';
// import {PointLight} from 'three/src/lights/PointLight';
// import {AmbientLight} from 'three/src/lights/AmbientLight';
// import {WebGLRenderer} from 'three/src/renderers/WebGLRenderer';
// import {OrthographicCamera} from 'three/src/cameras/OrthographicCamera';
// import {PerspectiveCamera} from 'three/src/cameras/PerspectiveCamera';
// import {Raycaster} from 'three/src/core/Raycaster';
// import {BufferGeometry} from 'three/src/core/BufferGeometry';
// import {BufferAttribute} from 'three/src/core/BufferAttribute';
// import {Vector2} from 'three/src/math/Vector2';
// import {Vector3} from 'three/src/math/Vector3';
// import {Quaternion} from 'three/src/math/Quaternion';
// import {Matrix4} from 'three/src/math/Matrix4';
// import {Vector4} from 'three/src/math/Vector4';
import {Camera} from './Camera.js';
// import isEqual from 'lodash/isEqual';
import * as GeometryManager from './GeometryManager.js';
import * as THREE from 'three';
const Matrix4 = THREE.Matrix4;
const Vector4 = THREE.Vector4;
const Vector3 = THREE.Vector3;
const Vector2 = THREE.Vector2;
const Quaternion = THREE.Quaternion;
const Scene = THREE.Scene;
const PointLight = THREE.PointLight;
const AmbientLight = THREE.AmbientLight;
const WebGLRenderer = THREE.WebGLRenderer;
const OrthographicCamera = THREE.OrthographicCamera;
// const Camera = THREE.Camera;
const Raycaster = THREE.Raycaster;

/*
const defaultParameters = {
  position: new Vector3,
  rotation: new Quaternion,
  scale: new Vector3(1, 1, 1)
  };
  */

export class CanvasBase extends React.Component {
  constructor(props) {
    super(props);
    this.scene = new Scene;
    this.geometryCache = {};
    this.scene.userData.meshesIndex = [];
    this.normalizedMouse = new Vector2;
    this.rayCaster = new Raycaster;
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseWheel = this.onMouseWheel.bind(this);
    this.lights = [];
    this.lights.push(new AmbientLight(0xeeeeee));
    this.lights.push(new PointLight(0xffffff, 10 ));
    this.lights[1].position.set(0, 2, 0);
    this.lights.forEach(l => this.scene.add(l));
  }

  pickMesh(event) {
    const normalizedMouse = new Vector2;
    normalizedMouse.x = ( (event.clientX - this.nodeRect.left) / this.refs.node.width ) * 2 - 1;
    normalizedMouse.y = -( (event.clientY - this.nodeRect.top ) / this.refs.node.height ) * 2 + 1;
    this.rayCaster.setFromCamera(normalizedMouse, this.camera);

    const intersects = this.rayCaster.intersectObject( this.scene, true )
      .filter(m => m.object.userData.interactable);
      // console.log(intersects);
    this.currentIntersections = intersects;

    if (intersects.length > 0) {
      if (intersects[0].object != this.pickedMesh) {
        if (intersects[0].object.userData.onEnter) {
          intersects[0].object.userData.onEnter(event);
        }
        if (this.pickedMesh && this.pickedMesh.userData.onLeave) {
          this.pickedMesh.userData.onLeave(event);
        }
        this.pickedMesh = intersects[0].object;
      }
    } else {
      if (this.pickedMesh) {
        if (this.pickedMesh.userData.onLeave) {
          this.pickedMesh.userData.onLeave(event);
        }
        this.pickedMesh = null;
      }
    }
  }

  eventToNormalizedCanvas({clientX, clientY}) {
    const normalizedMouse = new Vector2;
    const node = this.refs.node;
    normalizedMouse.x = ((clientX - this.nodeRect.left) / node.width ) * 2 - 1;
    normalizedMouse.y = -((clientY - this.nodeRect.top ) / node.height ) * 2 + 1;
    return normalizedMouse;
  }

  onMouseWheel(e) {
    const delta = e.wheelDelta ? e.wheelDelta : (-e.detail * 100.0);
    this.zoomCamera(delta);
    e.preventDefault();
  }

  onWindowMouseMove(e) {
    this.onMouseMove(e);
    e.preventDefault();
  }

  eventInWorldPlane(e) {
    const v = new Vector3(
      ((e.clientX - this.nodeRect.left) / this.refs.node.width) * 2 - 1, 
      -((e.clientY - this.nodeRect.top ) / this.refs.node.height) * 2 + 1, 
      0);
    return v.unproject(this.camera);
  }

  calculateVectorsInWorldPlane(e) {
    const vs = [this._lastMouseEvent, e];
    return vs.map(e => new Vector3(
      ((e.clientX - this.nodeRect.left) / this.refs.node.width) * 2 - 1, 
      -((e.clientY - this.nodeRect.top ) / this.refs.node.height) * 2 + 1, 
      0))
      .map(v => v.unproject(this.camera));
  }

  rayToWorld(e) {
    return this.rayCaster.ray.clone();
  }

  onMouseMove(e) {
    if (this.draggable) {
      const diff = [
        e.clientX - this._lastMouseEvent.clientX, 
        e.clientY - this._lastMouseEvent.clientY 
      ];
      if (!this.dragStarted && this.draggable.userData.onDragStart) {
        this.dragStarted = true;
        this.draggable.userData.onDragStart(e, this.eventInWorldPlane(e), this.rayToWorld(e));
      }
      this.draggable.userData.onDrag(e, diff, this.calculateVectorsInWorldPlane(e), this.rayToWorld(e));
    } else {
      if (this._lastMouseDown) {
        this.cameraHandler.rotate(e);
        this.renderCanvas();
      }
    }
    this.pickMesh(e);
    if (this.pickedMesh && this.pickedMesh.userData.onMouseMove) {
      this.pickedMesh.userData.onMouseMove(e, this.currentIntersections);
    }
    this._lastMouseEvent = e;
  }

  toArcRot(event) {
    const projected = this.toWorldNoRotation(event);
    const len = projected.x * projected.x + projected.y * projected.y;
    const arcRadius = 0.1;
    const sz = arcRadius * arcRadius - len;
    return new Vector3(projected.x, projected.y, Math.sqrt(sz));
  }

  toWorldNoRotation(evt) {
    const m = this.camera.matrix.clone();
    const i = new Matrix4().getInverse(m.clone());
    const mm = new Matrix4().makeTranslation(...this.camera.position.clone().negate().toArray());
    const mmm = new Matrix4().multiplyMatrices(mm, m);
    const v = new Vector4(0, 0, 0, 1).applyMatrix4(mmm);

    v.x = (2 * (evt.clientX - this.nodeRect.left) / this.nodeRect.width - 1) * v.w;
    v.y = (2 * (evt.clientY - this.nodeRect.top) / this.nodeRect.height - 1) * v.w;
    v.applyMatrix4(i);
    return v;
  }


  rotateCamera(firstMouseDown, currentMouseMove, prevMouseMove) {

    const p1 = this.toArcRot(firstMouseDown); 
    const p2 = this.toArcRot(currentMouseMove);

    const axis = new Vector3().crossVectors(p1, p2).normalize();
    const angle = p2.angleTo(p1);
      
    const q = new Quaternion().setFromAxisAngle(axis, angle);
    const p = this.cameraInitials.position.clone();
    const u = this.cameraInitials.up.clone();
    p.applyQuaternion(q);
    u.applyQuaternion(q);
    this.camera.position.set(...p.toArray());
    this.camera.up.set(...u.toArray());
      
    this.camera.lookAt(new Vector3);
    this.renderCanvas();
  }

  zoomCamera(delta) {
    this.camera.zoom *= Math.pow(1.001, delta);
    this.camera.updateProjectionMatrix();
    this.renderCanvas();
  }
    
  onWindowMouseUp(e) {
    const {clientX, clientY} = e;
    if (clientX > this.nodeRect.left && clientX <= this.nodeRect.right) {
      return;
    }
    if (clientY > this.nodeRect.top && clientY <= this.nodeRect.bottom) {
      return;
    }

    this.onMouseUp(e);
  }

  onMouseUp(e) {
    e.preventDefault();
    this._lastMouseDown = null;
    if (this.draggable && this.draggable.onDragEnds) {
      this.draggable.onDragEnds(e, this.eventInWorldPlane(e));
    }
    this.draggable = null;
    this.dragStarted = false;

    if (!this.pickedMesh) {
      return;
    }
    if (this.pickedMesh.userData.onMouseUp) {
      this.pickedMesh.userData.onMouseUp(e);
    }
  }

  onMouseDown(e) {
    this._lastMouseDown = e;
    this._lastMouseEvent = e;
    this.cameraInitials = {
      position: this.camera.position.clone(),
      up: this.camera.up.clone()
    };
    this.cameraHandler.startRotation(e);
    if (!this.pickedMesh) {
      return;
    }
    if (this.pickedMesh.userData.onMouseDown) {
      this.pickedMesh.userData.onMouseDown(e);
    }

    if (this.pickedMesh.userData.onDrag) {
      this.draggable = this.pickedMesh;
    }

  }
  updateLights() {

    //this.lights.forEach((l,ix)=>{
    //this.scene.children[ix] = l;
    //});
    //console.log(this.scene);
  }

  stopLoop() {
    this.runningLoop = false;
  }

  startLoop(eachLoop) {

    let tick;
    if (eachLoop) {
      tick = (ts) => { 
        eachLoop(ts);
        this.renderCanvas();
        if (!this.runningLoop) {
          return;
        }

        const spent = ts - this._prevTS;
        // console.log("tick", spent);
        this._prevTS = ts;
        window.requestAnimationFrame(tick);
      };
    } else {
      tick = (ts) => {
        this.renderCanvas();
        if (!this.runningLoop) {
          return;
        }
        window.requestAnimationFrame(tick);
      };
    }

    this.runningLoop = true;
    window.requestAnimationFrame(tick);
  }

  prerender() { }

  renderCanvas() {
    this.renderer.clear(true, true, true);
    const components = this.renderScene();
    this.updateLights();
    this.updateMeshes(this.scene, components);
    this.scene.add(new THREE.AxisHelper(1));
    const flags = this.prerender();
    this.renderer.clear(...flags);
    this.renderer.render(this.scene, this.camera);

  }

  updateMeshes(rootMesh, meshComponents) {
    let ix = 0;
    const childrenOffset = this.lights.length;
    for (; ix < meshComponents.length; ++ix) {
      const item = meshComponents[ix];
      const mesh = rootMesh.children[ix + childrenOffset];
      if (!mesh) {
        const nm = this.createNewMesh(item);
        rootMesh.children[ix + childrenOffset] = nm;
        nm.dispatchEvent({type: 'added'});
      } else {
        this.updateMesh(rootMesh, ix, item);
        if (item.children) {
          updateMeshes(mesh, item.children);
        }
      }
    }
    // ix stands on meshComponents.length;
    if ( ix + childrenOffset < rootMesh.children.length) {
      rootMesh.children.splice(ix + childrenOffset).forEach(mesh => {
      });
    }

  }


  createNewMesh(item) {
    const {geometry, material, ...rest} = item;
    let G, M;

    if (geometry.type) {
      G = GeometryManager.createGeometry(geometry);
    } else {
      G = GeometryManager.createBufferGeometry(geometry);
    }

    M = this.createMaterial(material);
    const mesh = new item.type(G, M);
    this.updateMeshProperties(mesh, rest);
    return mesh;
  }

  updateMeshMaterial(mesh, props) {
    const {type, properties} = props;
      
    const M = mesh.material;
    if (!mesh.material || !(mesh.material instanceof type)) {
      mesh.material = this.createMaterial(props);
    } else {
      if (mesh.material.uniforms) {
        for (const uname in properties.uniforms) {
          mesh.material.uniforms[uname].value = properties.uniforms[uname];
        }
      }

      for (const p in properties) {
        if (p == 'uniforms') {
          continue;
        }
        if (p == 'staticUniforms') {
          continue;
        }
        mesh.material[p] = properties[p];
      }
      mesh.material.needsUpdate = true;
    }
  }

  createMaterial(props) {
    const {type, properties} = props;
    const M = new type(properties);
    return M;
  }

  /*

    createGeometry(props){
      let geometry = new props.type(...props.arguments);
      this.geometryCache[geometry.uuid] = props;
      return geometry;
    }

    replaceGeometryIfNeeded(props, oldGeometry){
      let cached = this.geometryCache[oldGeometry.uuid] || {};
      if(props.type == cached.type && isEqual(props.arguments, cached.arguments)){
        return oldGeometry;
      }else{
        // console.log("not ok", props.arguments, cached.arguments);
        
      }
      delete this.geometryCache[oldGeometry.uuid];
      return this.createGeometry(props);
    }

    createBufferGeometry(props){
      let geometry = new BufferGeometry();

      for(let key in props){
        let attr = props[key];
        let attribute = new BufferAttribute(attr.array, attr.size)
        if(key == 'index')
          geometry.setIndex(attribute);
        else
          geometry.addAttribute(key, attribute);
      }
      return geometry;
    }

*/

  updateMeshGeometry(mesh, geometry) {
    if (geometry.type) {
      mesh.geometry = GeometryManager.replaceGeometryIfNeeded(geometry, mesh.geometry);
    } else {
      mesh.geometry = GeometryManager.createBufferGeometry(geometry);
    }
  }

  updateMeshProperties(mesh, props) {
    const events = ['onMouseMove', 'onMouseUp', 'onMouseDown', 'onEnter', 'onLeave', 'onDrag', 'onDragStart', 'onDragEnds'];

    for (const key in props) {
      if (key === 'material') {
        this.updateMeshMaterial(mesh, props[key]);
        continue;
      }

      if (key === 'geometry') {
        this.updateMeshGeometry(mesh, props[key]);
        continue;
      }
      if (events.indexOf(key) !== -1) {
        continue;
      }

      const value = props[key];
      const property = Object.getOwnPropertyDescriptor(mesh, key);
      if (!property.writable) {
        if (mesh[key].set && value.toArray) {
          mesh[key].set(...value.toArray());
        } else {
          console.warn(`property '${key}' cannot be set in mesh`, mesh);
        }
      } else {
        mesh[key] = value;
      }
    }

    let hasEvents = false;
    events.forEach(evt => {
      if (props[evt]) {
        mesh.userData[evt] = props[evt];
        hasEvents = true;
        return;
      }

      if (mesh.userData[evt]) {
        delete mesh.userData[evt];
        return;
      }

    });
    mesh.userData.interactable = hasEvents;
  }


  updateMesh(rootMesh, ix, item) {
    const childrenOffset = this.lights.length;
    const oldMesh = rootMesh.children[ix + childrenOffset];
    const type = item.type;
    if (oldMesh instanceof type) {
      this.updateMeshProperties(oldMesh, item);
    } else {
      rootMesh.children[ix + childrenOffset] = this.createNewMesh(item);
    }
  }

  fixSize() {
    if (this.refs.node.width != this.refs.node.clientWidth || this.refs.node.height != this.refs.node.clientHeight) {
      this.refs.node.width = this.refs.node.clientWidth;
      this.refs.node.height = this.refs.node.clientHeight;
    }
  }

  render() {
    if (this.refs.node) {
      this.renderCanvas();
    }
    console.log('RENDER CANVAS');
    return <canvas ref='node' style={{width: '100%', height: '100%'}} />;
  }

  setupCamera() {
    this.camera.position.z = -10;
    this.camera.lookAt(new Vector3);
  }

  componentDidMount() {
    this._events = [
      {e: 'mousewheel', t: this.refs.node, f: this.onMouseWheel},
      {e: 'mousemove', t: this.refs.node, f: this.onMouseMove},
      {e: 'mousedown', t: this.refs.node, f: this.onMouseDown.bind(this)},
      {e: 'mouseup', t: this.refs.node, f: this.onMouseUp.bind(this)},
      {e: 'mouseup', t: window, f: this.onWindowMouseUp.bind(this)},
      {e: 'mousemove', t: window, f: this.onWindowMouseMove.bind(this)},
      {e: 'resize', t: window, f: this.resizeWindow.bind(this)}
    ];
    this.bindEvents();
    this.fixSize();
    const width = this.refs.node.width;
    const height = this.refs.node.height;
    this.nodeRect = this.refs.node.getBoundingClientRect();

    this.renderer = new WebGLRenderer({
      canvas: this.refs.node, 
      preserveDrawingBuffer: true,
      antialias: true
    });
    this.renderer.context.getExtension('OES_standard_derivatives');

    this.camera = //  new PerspectiveCamera(45, width/height, 0.01,20);
      new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 50);
    this.cameraHandler = new Camera(this.camera, this.refs.node);

    this.renderer.setClearColor(0x096dc7, 0);
    this.renderer.autoClear = false;
    this.renderer.autoClearColor = false;
    this.renderer.autoClearDepth = false;
    this.renderer.autoClearStencil = false;
    this.setupCamera();
    this.setState({});
  }

  componentWillUnmount() {
    this.unbindEvents();
  }

  bindEvents() {
    this._events.forEach(e => {
      e.t.addEventListener(e.e, e.f);
    });
  }

  unbindEvents() {
    if (this._events.length) {
      this._events.forEach(e => e.t.removeEventListener(e.e, e.f));
      this._events = [];
    }
  }

  resizeWindow() {
    this.nodeRect = this.refs.node.getBoundingClientRect();
    const {width, height} = this.nodeRect;
    // this.camera.left = width/2;
    // this.camera.right = -width/2;
    // this.camera.top = height/2;
    // this.camera.bottom = -height/2;
    this.camera.updateProjectionMatrix();
    // console.log(this.camera);
    this.renderCanvas();

  }

}
