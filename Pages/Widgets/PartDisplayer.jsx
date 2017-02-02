import React from 'react';

import {Color} from 'three/src/math/Color';
import {CanvasBase} from '../../Canvas.jsx'
import {Mesh} from 'three/src/objects/Mesh';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {MeshLambertMaterial} from 'three/src/materials/MeshLambertMaterial';
import {Line} from 'three/src/objects/Line';
import {LineBasicMaterial} from 'three/src/materials/LineBasicMaterial';
import {Vector3} from 'three/src/math/Vector3';
import {BoxBufferGeometry} from 'three/src/geometries/BoxBufferGeometry';
import * as RotationalShape from '../../math/RotationalShape.js'
import * as THREE from 'three/src/constants'
import * as Path from '../../math/Path.js';
import {Textures} from '../../Utils/TextureCache.js';

export class PartDisplay extends CanvasBase{
  constructor(props){
    super(props)
  }

  setupCamera(){
    this.cameraZoom = 0.02/10;
    
    this.camera.left *= this.cameraZoom;
    this.camera.right *= this.cameraZoom;
    this.camera.top *= this.cameraZoom;
    this.camera.bottom *= this.cameraZoom;
    this.camera.position.z = -10;
    this.camera.zoom = 0.5;

    this.camera.lookAt(new Vector3);
    this.camera.updateProjectionMatrix();
    this.onMeshMouseMove = this.onMeshMouseMove.bind(this);
  }  

  getPath(){
    let part = this.props.state.get('currentPart').toJS();
    let pointList = ['1,0', '1,0+', '1,1-', '1,1'];
    let points = RotationalShape.getPoints(part, pointList)
      .filter(p=>p)
      .map(p=>p.clone())
    return Path.getGeometry([
      {command: 'moveTo', ...points[0]},
      {command: 'curveTo', cp1:points[1], cp2:points[2], end:points[3]},
    ])
  }

  getControlPoints(){
    let part = this.props.state.get('currentPart').toJS();
    let pointList = ['1,0', '1,0+', '1,1-', '1,1', '2:111,0'];
    return RotationalShape.getPoints(part.calculated, pointList).filter(p=>p).map((p,ix)=>{
      let color;
      if(ix == 4) color = new Color(0xf0ff00);
      else if(ix == 1 || ix == 2) color = new Color(0xff00ff);

      else color = new Color(0xff0000);
      return {
        type: Mesh,
        geometry: {type: BoxBufferGeometry, arguments:[1,1,1].map(x=>x*0.01)},
        material: {
          type: MeshBasicMaterial, properties:{
            color
          }
        },

        position: new Vector3(p.x, p.y, p.z)
      }

    })
  }

  onMeshMouseMove(e, intersects){
    console.log("moving on mesh", intersects);
  }

  renderScene(){
    if(!this.props.state.has('currentPart')) return [];
    let part = this.props.state.get('currentPart').toJS();
    if(!part.calculated) return [];
    let faces = RotationalShape.getRotationalGeometry(part.calculated);
    let meshes = faces.map(({positions, indices, uvs, normals})=>{
      return {
        type: Mesh,
        onEnter: e=>{ console.log('enter');},
        onMouseMove: this.onMeshMouseMove,
        geometry: {position: positions, index: indices, uv:uvs, normal:normals},
        position: new Vector3,
        material: {
          type: MeshLambertMaterial, properties:{
            color: new Color(0xffffff),
            map: Textures.earthMap,
            side: THREE.FrontSide
          }
        }
      }
    });
    let cps = this.getControlPoints();
    let color = new Color(0x0000ff);

    return [...meshes, ...cps]; 
    /* ...this.getPath().map(geometry=>({
      type:Line,
      geometry:{position: geometry},
      material: {type:LineBasicMaterial, properties:{color}} 
      }))];*/
  }

}

