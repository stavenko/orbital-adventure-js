import React from 'react';
import {CanvasBase} from '../Canvas.jsx';
import {BoxBufferGeometry} from 'three/src/geometries/BoxBufferGeometry';
import {Mesh} from 'three/src/objects/Mesh';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';


export function ObjectEditor(props) {
  return <div style={{width: 500, height: 400}}>
    <ObjectEditorImpl {...props} />
  </div>;
}

const EditedObject = {
  id: Date.now(),
  hull: {
    axis: 'bezier', // all control points between 0.0 and 1.0
    crossSections: '[(bezier, t)]', // all control points between 0.0 and 1.0
    length: 'in-meters', // this is where actual width: from 0.0 to 1.0 there's length;
    hullPlanes: [{n: 'n0', p: 'p0'}]
  },

  weilds: [{
    hullPoint: 'hull-oriented-point',
    part: 'part-id',
    shift: 'part-shift',
    rotation: 'part-rotation'
  }],

  sinks: [{
    hullPoint: 'hull-oriented-point',
    diameter: 'in-meters'
  }],

  sources: [{
    hullPoint: 'hull-oriented-point',
    diameter: 'in-meters'
  }],


  connectedParts: [{
    weidlId: 'weilded-connector',
    partId: 'partId',
    partConnector: 'part-weild-connector'
  } // connector is a part with connection point
  ]
};


class ObjectEditorImpl extends CanvasBase {
  constructor(props) {
    super(props);
    const mesh = new Mesh(new BoxBufferGeometry(1, 1, 1), new MeshBasicMaterial({color: 0xff0000}));
    this.scene.add(mesh);
  }

  renderCanvas() {

    this.renderer.render(this.scene, this.camera);
  }
}
