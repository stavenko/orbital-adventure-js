import React from 'react';

import {Color} from 'three/src/math/Color';
import {CanvasBase} from '../../Canvas.jsx'
import {Mesh} from 'three/src/objects/Mesh';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {RawShaderMaterial} from 'three/src/materials/RawShaderMaterial';
import {MeshLambertMaterial} from 'three/src/materials/MeshLambertMaterial';
import {Line} from 'three/src/objects/Line';
import {LineBasicMaterial} from 'three/src/materials/LineBasicMaterial';
import {Vector3} from 'three/src/math/Vector3';
import {Vector2} from 'three/src/math/Vector2';
import {BoxBufferGeometry} from 'three/src/geometries/BoxBufferGeometry';
import * as RotationalShape from '../../math/RotationalShape.js'
import * as THREE from 'three/src/constants'
import * as Path from '../../math/Path.js';
import {QuadBezierBufferGeometry, TriangleBezierBufferGeometry} from '../../math/Geometry.js';
import {Textures} from '../../Utils/TextureCache.js';
import * as Quad from './../../math/QuadBezier.js';

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
    this.onMeshMouseClick = this.onMeshMouseClick.bind(this);
    this.randomColors = [new Color(0xff0000), new Color(0x00ff00), new Color(0x0000ff),
      new Color(0xff9900), new Color(0x00ff99), new Color(0x0099ff)

    ];
    for(let i =0; i< 1000; ++i){
      this.randomColors.push(new Color(Math.random(),Math.random(), Math.random()) );
    }
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

  splitAtS(s){
    this.props.actions.splitCurrentPartAtS(s);
  }

  splitAtT(t){
    this.props.actions.splitCurrentPartAtT(t);
  }

  onMeshMouseMove(e, intersects){
    this.sceneIntersection = intersects[0];
    this.scenePoint = intersects[0].point.clone();
    this.renderCanvas();

  }
   
  getControls(controlsArray, cpColor = new Color(0xff9900)){
    return controlsArray.map(({geometry, plane, controlPoints})=>{
      let meshes = []

      if(geometry)
        meshes.push({
          type: Line,
          // onMouseMove:(i,j)=>{},
          geometry:{position: geometry[0]},
          material: {
            type: LineBasicMaterial, 
            properties:{
              color:new Color(0xff0000)
            }
          }
      });


      meshes.push(...controlPoints.map(p=>({
        type: Mesh,
        geometry: {type: BoxBufferGeometry, arguments:[1,1,1].map(x=>x*0.01)},
        material: {
          type: MeshBasicMaterial, properties:{
            color: cpColor
          }
        },
        position: new Vector3(p.x, p.y, p.z)
      })));
      return meshes;
    }).reduce((a,b)=>{a.push(...b);return a}, []);
  }

  onMeshMouseClick(e){
    let editorState = this.props.state.get('editorState').toJS();
    switch(editorState.mode){
      case 'cross-slicing':
        return this.splitAtS(this.sceneIntersection.uv.y);
      case 'radial-slicing':
        return this.splitAtT(this.sceneIntersection.uv.x);

    }
  }

  renderCreatorScene(calculated){
    return RotationalShape.getRotationalGeometry(calculated).map((attrs,ix)=>{
      let c = this.randomColors[ix];
      return {
        type:Mesh,
        onMouseMove: this.onMeshMouseMove,
        onMouseUp: this.onMeshMouseClick,
        geometry:{
          type:attrs[0] == 16?QuadBezierBufferGeometry:TriangleBezierBufferGeometry,
          arguments: attrs.splice(1),
        },
        position: new Vector3,
        material:{
          type: MeshLambertMaterial, properties:{
            color: c,
            // map: Textures.earthMap,
            wireframe:true,
            side: THREE.FrontSide
          }
        }
      }
    });
  }

  renderEditorScene(calculated){
    let editorState = this.props.state.get('editorState').toJS();
    let mainMeshes = this.renderCreatorScene(calculated);

    let sliceControls  = RotationalShape.getSliceControls(calculated);
    let sideControls  = RotationalShape.getSideLineControls(calculated);
    let color = new Color(0x0000ff);
    let cps = this.getControls(sliceControls);

    let meshes = [...mainMeshes, ...this.getControls(sliceControls),
      ...this.getControls(sideControls),
      ...this.getControls(RotationalShape.getSurfaceControls(calculated), new Color(0x00ff99))
    ]
    if(this.sceneIntersection){
      let s = this.sceneIntersection.uv.y;
      let t = this.sceneIntersection.uv.x;
      let curve = [];

      if(editorState.mode == 'cross-slicing')
        curve = RotationalShape.getLineAtS(calculated, s);
      if(editorState.mode == 'radial-slicing')
        curve =  RotationalShape.getLineAtT(calculated, t);
      curve.forEach(({position})=>{
        meshes.push({
          type:Line,
          geometry: {position},
          material: {
            type: LineBasicMaterial, 
            properties:{color: new Color(0xff9900)
            }}
        })
      })

      meshes.push({
        type: Mesh,
        geometry: {type: BoxBufferGeometry, arguments:[1,1,1].map(x=>x*0.005)},
        material: {
          type: MeshBasicMaterial, properties:{
            color: new Color(0x00ffff),
            side: THREE.DoubleSide
          }
        },
        position: new Vector3().copy(this.sceneIntersection.point)
      })
    }
    return meshes; 

  }

  renderScene(){
    if(!this.props.state.has('currentPart')) return [];
    let part = this.props.state.get('currentPart').toJS();
    if(!part.calculated) return [];

    if(part.stage == 'rough'){
      return this.renderCreatorScene(part.calculated);
    }
    if(part.stage =='precise')
      return this.renderEditorScene(part.calculated);
  }

}

