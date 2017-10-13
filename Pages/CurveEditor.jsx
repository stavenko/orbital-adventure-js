import React from 'react';

import {} from 'three/src/objects/LineSegments';
import {Line} from 'three/src/objects/Line';
import {LineBasicMaterial} from 'three/src/materials/LineBasicMaterial';

import {Vector3} from 'three/src/math/Vector3';
import {Color} from 'three/src/math/Color';
import {Mesh} from 'three/src/objects/Mesh';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {BoxBufferGeometry} from 'three/src/geometries/BoxBufferGeometry';
import {CanvasBase} from '../Canvas.jsx';
import {Curve} from '../math/Curve.js';

export function CurveEditorWidget(props) {
  return <div style={{width: '100%', height: '40%'}}>
    <CurveEditorWidgetImpl {...props}/>
  </div>;

}
const CircleWeight = 0.5522539464083382;
const cw = CircleWeight;


class CurveEditorWidgetImpl extends CanvasBase {
  constructor(props) {
    super(props);
    this.curve = new Curve([
      0, 1, // a
      cw, 1,
      1, cw,
      1, 0, // b
      1, -cw,
      cw, -1,
      0, -1, // c
      -cw, -1,
      -1, -cw,
      -1, 0, // d
      -1, cw,
      -cw, 1,
      0, 1 //e
    ].map(x => x * 100), 2);
    this.state = {};
  }

  renderScene() {
    const lineMesh = { 
      type: Line, 
      geometry: {position: this.curve.getRawGeometry()}, 
      material: {type: LineBasicMaterial, 
        properties: {color: new Color(0x00ff00)}
      }
    };
    return [ lineMesh, ...this.getNodeMeshes()];
  }

  updateCurvePoint(controlPointId, coords) {
    console.log('update curve point', controlPointId);
    this.curve.set(controlPointId, [coords.x, coords.y]);
    this.setState({});
  }

  dragControlPoint(controlPointId) {
    return (event, diff) => {
      const mouse = new Vector3;
      const nmouse = this.eventToNormalizedCanvas(event);
      mouse.x = nmouse.x;
      mouse.y = nmouse.y;
      mouse.z = 0;
      const coords = mouse.unproject(this.camera);
      this.updateCurvePoint(controlPointId, coords);
    };
  }

  getNodeMeshes() {
    const state = this.state;
    const setState = this.setState.bind(this);
    const dcp = this.dragControlPoint.bind(this);
    return this.curve.getNodes().map(node => {
      const nodes = [];
      nodes.push(mesh(node.point));
      if (node.left) {
        nodes.push(mesh(node.left));
      }
      if (node.right) {
        nodes.push(mesh(node.right));
      }
      return nodes;
    }).reduce((arr, a) => {
      arr.push(...a); return arr;
    }, []);


    function mesh(point) {
      const color = point.id === state.hoveredPoint ?
        new Color(0xff0000) :
        new Color(0x0000ff);
      return {
        type: Mesh,
        geometry: {type: BoxBufferGeometry, arguments: [20, 20, 20]},
        material: {type: MeshBasicMaterial, properties: {color}},
        position: new Vector3(point.x, 
          point.y, 
          point.z ? point.z : -1.0),
        onEnter: () => {
          setState({hoveredPoint: point.id});
        },
        onLeave: () => {
          setState({hoveredPoint: null});
        },
        onDrag: dcp(point.id)
      };
    }
  }
}
