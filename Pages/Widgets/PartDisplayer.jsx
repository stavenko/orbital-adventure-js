import React from 'react';

import {CanvasBase} from '../Canvas.jsx'
import {RotationalPart} from '../../math/RotationalPart.js"

export class PartDisplay extends CanvasBase{
  constructor(props){
    super(props)
  }
  renderScene(){
    let faces = RotationalPart.getRotationalGeometry(this.props.part);
    let meshes = faces.map(({positions, indices})=>{
      return {
        type: Mesh
        geometry: {position: positions, index: indices}
        material: {
          type: MeshBasicMaterial, properties:{color: new Color(0xeeeeee)}
        }
      }
    }
  }

}

