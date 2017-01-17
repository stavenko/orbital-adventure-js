import React from 'react';

import {Color} from 'three/src/math/Color';
import {CanvasBase} from '../../Canvas.jsx'
import {Mesh} from 'three/src/objects/Mesh';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {Vector3} from 'three/src/math/Vector3';
import * as RotationalPart from '../../math/RotationalPart.js'
import * as THREE from 'three/src/constants'

export class PartDisplay extends CanvasBase{
  constructor(props){
    super(props)
  }

  setupCamera(){
    let ratio = 0.02/3;
    
    this.camera.left *= ratio;
    this.camera.right *= ratio;
    this.camera.top *= ratio;
    this.camera.bottom *= ratio;
    this.camera.position.z = -10;

    this.camera.lookAt(new Vector3);
    this.camera.updateProjectionMatrix();
  }  

  renderScene(){
    console.log('---------------', THREE);
    if(!this.props.state.has('currentPart')) return [];
    let part = this.props.state.get('currentPart').toJS();
    let faces = RotationalPart.getRotationalGeometry(part);
    console.log(faces);
    let meshes = faces.map(({positions, indices})=>{
      return {
        type: Mesh,
        geometry: {position: positions, index: indices},
        material: {
          type: MeshBasicMaterial, properties:{
            color: new Color(0xeeeeee),
            side: THREE.DoubleSide
          }
        }
      }
    })
    console.log(meshes);
    return meshes;
  }

}

