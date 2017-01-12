import React from 'react';
import ReactDOM from 'react-dom';
import {Scene} from 'three/src/scenes/Scene';
import {WebGLRenderer} from 'three/src/renderers/WebGLRenderer';
import {OrthographicCamera} from 'three/src/cameras/OrthographicCamera';
import {Raycaster} from 'three/src/core/Raycaster';
import {BufferGeometry} from 'three/src/core/BufferGeometry';
import {BufferAttribute} from 'three/src/core/BufferAttribute';
import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';
import isEqual from 'lodash/isEqual';


export class CanvasBase extends React.Component{
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
    }

    pickMesh(event){
      let normalizedMouse = new Vector2;
      normalizedMouse.x = ( (event.clientX - this.nodeRect.left) / this.refs.node.width ) * 2 - 1;
      normalizedMouse.y = - ( (event.clientY - this.nodeRect.top )/ this.refs.node.height ) * 2 + 1;
        this.rayCaster.setFromCamera(normalizedMouse, this.camera);

        let intersects = this.rayCaster.intersectObject( this.scene, true );

        if(intersects.length>0){
          if(intersects[0].object != this.pickedMesh){
            if(intersects[0].object.userData.onEnter)
              intersects[0].object.userData.onEnter(event);
            if(this.pickedMesh && this.pickedMesh.userData.onLeave)
              this.pickedMesh.userData.onLeave(event);
            this.pickedMesh = intersects[0].object;
          }else{
          }
      }else
        if(this.pickedMesh){
          if(this.pickedMesh.userData.onLeave)
            this.pickedMesh.userData.onLeave(event);
            this.pickedMesh = null;
        }

    }

    eventToNormalizedCanvas({clientX, clientY}){
      let normalizedMouse = new Vector2;
      let node = this.refs.node;
      normalizedMouse.x = ((clientX - this.nodeRect.left) / node.width ) * 2 - 1;
      normalizedMouse.y = -((clientY - this.nodeRect.top )/ node.height ) * 2 + 1;
      return normalizedMouse;
    }

    onMouseMove(e){
      if(this.draggable){
        let diff = [
          e.clientX - this._lastMouseEvent.clientX, 
          e.clientY - this._lastMouseEvent.clientY 
        ];
        
        this.draggable.userData.onDrag(e, diff);
        this._lastMouseEvent = e;
        return;
      }
      this.pickMesh(e);
    }

    onMouseUp(e){
      if(!this.pickedMesh) return;
      if(this.pickedMesh.userData.onMouseUp)
        this.pickedMesh.userData.onMouseUp(e);
      this.draggable = null;
    }

    onMouseDown(e){
      if(!this.pickedMesh) return;
      if(this.pickedMesh.userData.onMouseDown)
        this.pickedMesh.userData.onMouseDown(e);

      if(this.pickedMesh.userData.onDrag){
        this.draggable = this.pickedMesh;
        this._lastMouseEvent = e;
      }

    }

    renderCanvas(){
      let components = this.renderScene();
      this.updateMeshes(this.scene, components);
      this.renderer.render(this.scene, this.camera);

    }

    updateMeshes(rootMesh, meshConponents){
      let ix = 0;
      for(; ix < meshConponents.length; ++ix){
        let item = meshConponents[ix];
        let mesh = rootMesh.children[ix];
        if(!mesh) {
          rootMesh.children[ix] = this.createNewMesh(item);
        }else{
          this.updateMesh(rootMesh, ix, item);
          if(item.children){
            updateMeshes(mesh, item.children);
          }
        }
      }
      // ix stands on meshComponents.length;
      if( ix < rootMesh.children.length){
        rootMesh.childre.splice(ix).forEach(mesh=>{});
      }
    }


    createNewMesh(item){
      console.log('create new mesh');
      let {geometry, material, ...rest} = item;
      let G, M;

      if(geometry.type){
        G = this.createGeometry(geometry);
      }else{
        G = this.createBufferGeometry(geometry);
      }

      M = this.createMaterial(material);
      let mesh = new item.type(G, M);
      this.updateMeshProperties(mesh, rest);
      return mesh;
    }

    updateMeshMaterial(mesh, props){
      let {type, uniforms, properties} = props;
      
      let M = mesh.material;
      if(!mesh.material || !(mesh.material instanceof type)) 
        mesh.material = this.createMaterial(props);
      else{
        if(mesh.material.uniforms)
          for(let uname in unifoms){
            mesh.material.unifoms[uname].value = uniforms[uname];
          }
        for(let p in properties) {
          mesh.material[p] = properties[p];
        }
      }
    }

    createMaterial(props){
      let {type, uniforms, properties} = props;
      let M = new type(properties);
      if(!M.uniforms) return M;

      for(let uname in unifoms){
        M.unifoms[uname].value = uniforms[uname];
      }
      return M;
    }

    createGeometry(props){
      let geometry = new props.type(...props.arguments);
      this.geometryCache[geometry.UUID] = props;
      return geometry;
    }

    replaceGeometryIfNeeded(props, oldGeometry){
      let cached = this.geometryCache[oldGeometry.UUID] || {};
      if(props.type == cached.type && isEqual(props.arguments, cached.arguments))
        return oldGeometry;
      delete this.geometryCache[oldGeometry.UUID];
      return this.createGeometry(props);
    }

    createBufferGeometry(props){
      let geometry = new BufferGeometry();
      for(let key in props){
        let attr = props[key];
        let attribute = new BufferAttribute(attr.array, attr.size)
        geometry.addAttribute(key, attribute);
      }
      return geometry;
    }


    updateMeshGeometry(mesh, geometry){
      if(geometry.type){
        mesh.geometry = this.replaceGeometryIfNeeded(geometry, mesh.geometry);
      }else{
        mesh.geometry = this.createBufferGeometry(geometry);
      }
    }

    updateMeshProperties(mesh, props){
      let events = ['onMouseMove', 'onMouseUp', 'onMouseDown', 'onEnter', 'onLeave','onDrag'];
      for(let key in props){
        if(key === 'material') {
          this.updateMeshMaterial(mesh, props[key]);
          continue;
        }

        if(key === 'geometry') {
          this.updateMeshGeometry(mesh, props[key]);
          continue;
        }
        if(events.indexOf(key) !== -1) continue;

        let value = props[key];
        let property = Object.getOwnPropertyDescriptor(mesh, key);
        if(!property.writable) 
          if(mesh[key].set && value.toArray) 
            mesh[key].set(...value.toArray());
          else console.warn(`property '${key}' cannot be set in mesh`, mesh)
        else 
          mesh[key] = value;
      }
      events.forEach(evt=>{
        if(props[evt]) {
          mesh.userData[evt] = props[evt];
          return;
        }
        if(mesh.userData[evt]) {
          delete mesh.userData[evt];
          return;
        }

      })
    }


    updateMesh(rootMesh, ix, item){
      let oldMesh = rootMesh.children[ix];
      let type = item.type;
      if(oldMesh instanceof type){
        this.updateMeshProperties(oldMesh, item);
      }else{
        rootMesh.children[ix] = this.createNewMesh(item);
      }
    }

    fixSize(){
        if(this.refs.node.width != this.refs.node.clientWidth || this.refs.node.height != this.refs.node.clientHeight){
            this.refs.node.width = this.refs.node.clientWidth;
            this.refs.node.height = this.refs.node.clientHeight;
        }
    }

    render() {
      if(this.refs.node) this.renderCanvas();
      return <canvas ref='node' style={{width:'100%', height:'100%'}} />
    }

    setupCamera(){
      this.camera.position.z = -10;
      this.camera.lookAt(new Vector3);
    }

    componentDidMount(){
      this._events = [
        {e:'mousemove', t:this.refs.node, f:this.onMouseMove},
        {e:'mousedown', t:this.refs.node, f:this.onMouseDown.bind(this)},
        {e:'mouseup', t:this.refs.node, f:this.onMouseUp.bind(this)},
        {e:'resize', t:window, f:this.resizeWindow.bind(this)}
      ];
      this.bindEvents();
      this.fixSize();
      let width = this.refs.node.width;
      let height = this.refs.node.height;
      this.nodeRect = this.refs.node.getBoundingClientRect();

      this.renderer = new WebGLRenderer({canvas: this.refs.node});
      this.camera = new OrthographicCamera(width/2 , -width/2, height/2, -height/2, 1, 100);

      this.setupCamera();
      this.setState({});
    }

    componentWillUnmount(){
        this.unbindEvents();
    }

    bindEvents(){
      this._events.forEach(e=>{
        e.t.addEventListener(e.e, e.f);
      });
    }

    unbindEvents(){
      if(this._events.length) {
          this._events.forEach(e=>e.t.removeEndEventListener(e.e, e.f));
          this._events = [];
      }
    }

    resizeWindow(){
        console.log('resize-rezise');
    }

}
