import React from 'react';
import {CanvasBase} from '../Canvas.jsx';
import * as Path from '../math/Path.js';
import {Line} from 'three/src/objects/Line';
import {LineBasicMaterial} from 'three/src/materials/LineBasicMaterial';
import {Color} from 'three/src/math/Color';
import {Mesh} from 'three/src/objects/Mesh';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {BoxBufferGeometry} from 'three/src/geometries/BoxBufferGeometry';
import {Vector3} from 'three/src/math/Vector3';
export class PathEditor extends CanvasBase {

  constructor(props) {
    super(props);

    this.path = new Path([
      {command: 'moveto', x: 10, y: 10, z: 0},
      {command: 'lineto', x: 20, y: 20, z: 0},
      {command: 'curveto', cp1: { x: 30, y: 30, z: 0 }, 
        cp2: { x: 50, y: 30, z: 0 }, 
        end: { x: 50, y: 0, z: 0 }},

    ]);
  }

  setupCamera() {
    const ratio = 0.2;
    
    this.camera.left *= ratio;
    this.camera.right *= ratio;
    this.camera.top *= ratio;
    this.camera.bottom *= ratio;
    this.camera.position.z = -10;

    this.camera.lookAt(new Vector3);
    this.camera.updateProjectionMatrix();
  }  

  movePath(evt, node) {
    const mouse = new Vector3;
    const nmouse = this.eventToNormalizedCanvas(event);
    mouse.x = nmouse.x;
    mouse.y = nmouse.y;
    mouse.z = 0;
    const coords = mouse.unproject(this.camera);
    this.path.modify(node.commandId, node.key || '', mouse);
    this.setState({});

  }

  getControlPoints() {
    return this.path.getNodes().map((node, i) => {
      let color = new Color(0x00ff00);
      if (i == this.state.currentNodeHovered) {
        color = new Color(0x0000ff);
      }
      return {type: Mesh,
        geometry: {type: BoxBufferGeometry, arguments: [1, 1, 1]},
        material: {type: MeshBasicMaterial, 
          properties: {color}},
        position: new Vector3(node.x, node.y, node.z),
        onEnter: () => {
          this.setState({currentNodeHovered: i});
        },
        onLeave: () => {
          this.setState({currentNodeHovered: null});
        },
        onDrag: (evt) => {
          this.movePath(evt, node); 
        }

      };
    });
  }

  renderScene() {
    const lines = this.path.getRawGeometry().map(g => {
      return {
        type: Line,
        geometry: {position: g},
        material: {type: LineBasicMaterial, properties: {color: new Color(0xff0000)}}
      };
    });
    return [...lines, ...this.getControlPoints()];
  }

}
