import React from 'react';

import {Color} from 'three/src/math/Color';
import {CanvasBase} from '../../Canvas.jsx';
import {Mesh} from 'three/src/objects/Mesh';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {RawShaderMaterial} from 'three/src/materials/RawShaderMaterial';
import {MeshLambertMaterial} from 'three/src/materials/MeshLambertMaterial';
import {Line} from 'three/src/objects/Line';
import {LineBasicMaterial} from 'three/src/materials/LineBasicMaterial';
import {LineDashedMaterial} from 'three/src/materials/LineDashedMaterial';
import {Vector3} from 'three/src/math/Vector3';
import {Vector2} from 'three/src/math/Vector2';
import {BoxBufferGeometry} from 'three/src/geometries/BoxBufferGeometry';
import {SphereBufferGeometry} from 'three/src/geometries/SphereBufferGeometry';
import {PointsMover} from '../../math/RotationalPointsMover.js';
import * as RotationalShape from '../../math/RotationalShape.js';
import * as THREE from 'three/src/constants';
import * as Path from '../../math/Path.js';
import {QuadBezierBufferGeometry,
  PlaneGeometry, 
  RotationalPartGeometry,
  PlaneCutGeometry,
  TriangleBezierBufferGeometry
} from '../../math/Geometry.js';
import {Textures} from '../../Utils/TextureCache.js';
import * as Quad from './../../math/QuadBezier.js';
import {getPlaneControls, PlaneModifier} from './../../math/PlaneControls.js';

export class PartDisplay extends CanvasBase {
  constructor(props) {
    super(props);
  }

  setupCamera() {
    this.cameraZoom = 0.02 / 10;
    
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
    for (let i = 0; i < 1000; ++i) {
      this.randomColors.push(new Color(Math.random(), Math.random(), Math.random()) );
    }
  }  

  getPath() {
    const part = this.props.state.get('currentPart').toJS();
    const pointList = ['1,0', '1,0+', '1,1-', '1,1'];
    const points = RotationalShape.getPoints(part, pointList)
      .filter(p => p)
      .map(p => p.clone());
    return Path.getGeometry([
      {command: 'moveTo', ...points[0]},
      {command: 'curveTo', cp1: points[1], cp2: points[2], end: points[3]},
    ]);
  }

  getControlPoints() {
    const part = this.props.state.get('currentPart').toJS();
    const pointList = ['1,0', '1,0+', '1,1-', '1,1', '2:111,0'];
    return RotationalShape.getPoints(part.calculated, pointList).filter(p => p).map((p, ix) => {
      let color;
      if (ix == 4) {
        color = new Color(0xf0ff00);
      } else if (ix == 1 || ix == 2) {
        color = new Color(0xff00ff);
      } else {
        color = new Color(0xff0000);
      }
      return {
        type: Mesh,
        geometry: {type: BoxBufferGeometry, arguments: [1, 1, 1].map(x => x * 0.01)},
        material: {
          type: MeshBasicMaterial, properties: {
            color
          }
        },

        position: new Vector3(p.x, p.y, p.z)
      };

    });
  }

  splitAtS(s) {
    this.props.actions.splitCurrentPartAtS(s);
  }

  splitAtT(t) {
    this.props.actions.splitCurrentPartAtT(t);
  }

  onMeshMouseMove(e, intersects) {
    this.sceneIntersection = intersects[0];
    this.scenePoint = intersects[0].point.clone();
    this.renderCanvas();

  }

  moveControlPoint(ix, [from, to]) {
    const part = this.props.state.get('currentPart').toJS();
    RotationalShape.moveControlPoint(part.calculated, ix, from, to);
  }

  getShape() {
    return this.props.state.get('currentPart').toJS();
  }

  startDrag(ix, constrain, e, wv, ray) {
    const mode = this.props.state.getIn(['editorState', 'mode']);
    if (mode == 'edit-slices' || mode == 'edit-radials' ) {
      this.setState({
        pointsMover: new PointsMover(
          this.getShape(), e, ix, ray, constrain,
          this.props.state.getIn(['editorState', 'mode'])) 
      });
    } else if (mode == 'plane-cutter') {
      const part = this.props.state.get('currentPart').toJS();
      const planeId = this.props.state.getIn(['editorState', 'selectedPlane']);
      const planes = part.calculated.cuttingPlanes || [];
      const plane = planes[planeId];
      this.setState({
        pointsMover: new PlaneModifier(plane, e, ix, ray, constrain, this.props.state.getIn(['editorState', 'mode']))
      });

    }
  }

  finalizeDrag() {
    const mode = this.props.state.getIn(['editorState', 'mode']).toJS();
    if (mode == 'edit-slices' || mode == 'edit-radials' ) {
      this.props.actions.changePartPoints(this.state.pointsMover.getPointIndex());
    } else if (mode == 'plane-cutter') {
      const ix = this.props.state.getIn(['editorState', 'selectedPlane']).toJS();
      this.props.actions.changePlane(ix, this.state.pointsMover.getPlane());
    }

  }

  dragControlPoint(ray, e) {
    this.state.pointsMover.move(ray, e);
    const mode = this.props.state.getIn(['editorState', 'mode']);
    if (mode == 'edit-slices' || mode == 'edit-radials' ) {
      return this.props.actions.changePartPoints(this.state.pointsMover.getPointIndex());
    } else if (mode == 'plane-cutter') {
      const ix = this.props.state.getIn(['editorState', 'selectedPlane']);
      return this.props.actions.changePlane(ix, this.state.pointsMover.getPlane());
    }
  }
   
  getControls(controlsArray, cpColor = new Color(0xff9900)) {
    return controlsArray.map(({point, ix, constrain}) => {
      let c = cpColor.clone();
      if (this.state.hovered == ix) {
        c = new Color(0xff0000);
      }
      let geometry;
      if (constrain.type != 'rotation') {
        geometry = {type: BoxBufferGeometry, arguments: [0.01, 0.01, 0.01]};
      } else {
        geometry = {type: SphereBufferGeometry, arguments: [0.03, 10, 10]};
      }
      return {
        type: Mesh,
        position: point.clone(),
        onEnter: () => {
          this.setState({hovered: ix});
        },
        onLeave: () => {
          this.setState({hovered: null});
        },
        onDragEnds: () => {
          this.finalizeDrag();
        },
        onDragStart: (a, b, c) => this.startDrag(ix, constrain, a, b, c),
        onDrag: (e, diff, vs, ray) => {
          this.dragControlPoint(ray, e);
        },
        geometry,
        material: {type: MeshLambertMaterial, properties: {
          color: c,
          wireframe: false
        }}
      };
    });
  }

  onMeshMouseClick(e) {
    const editorState = this.props.state.get('editorState').toJS();
    switch (editorState.mode) {
      case 'cross-slicing':
        return this.splitAtS(this.sceneIntersection.uv.y);
      case 'radial-slicing':
        return this.splitAtT(this.sceneIntersection.uv.x);

    }
  }

  renderCreatorScene(calculated) {
    const c = this.randomColors[0];
    return [{
      type: Mesh,
      geometry: {
        type: PlaneCutGeometry, 
        arguments: [
          {
            type: RotationalPartGeometry, 
            arguments: [calculated],
            id: 'main-mesh'
          }, 
          calculated.cuttingPlanes
        ]},
      position: new Vector3,
      onMouseMove: this.onMeshMouseMove,
      onMouseUp: this.onMeshMouseClick,
      material: {
        type: MeshLambertMaterial, properties: {
          //color: c,
          map: Textures.earthMap,
          wireframe: false,
          side: THREE.FrontSide
        }
      }
    }];

    /*return RotationalShape.getRotationalGeometry(calculated).map((attrs,ix)=>{
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
            wireframe: true,
            side: THREE.FrontSide
          }
        }
      }
      }); */
  }

  renderCurves(curveGeometries, withColor = new Color(0x9999ff)) {
    return curveGeometries.map(pos => ({
      type: Line,
      geometry: {position: pos},
      material: {
        type: LineDashedMaterial, 
        properties: {
          color: withColor,
          wireframe: false
        }
      }
    }));
  }

  planeMesh(plane) {
    const ix = this.props.state.getIn(['editorState', 'selectPlane']);
    return {
      type: Mesh,
      geometry: {
        type: PlaneGeometry, 
        arguments: [plane, 1, 1], 
        id: `plane-${ix}`
      },
      position: new Vector3(0, 0, 0),
      material: {type: MeshBasicMaterial, properties: {
        color: new Color(0xffffff),
        wireframe: true
      }}
    };
  }

  renderEditorScene(calculated) {
    const editorState = this.props.state.get('editorState').toJS();
    let mainMeshes = this.renderCreatorScene(calculated);

    const color = new Color(0x0000ff);
    //
    let controlMeshes = [];
    if (editorState.mode == 'edit-slices') {
      controlMeshes = this.getControls(RotationalShape.getSliceControls(calculated));
      mainMeshes = this.renderCurves(RotationalShape.getCurves(calculated));
    }
    if (editorState.mode == 'edit-radials') {
      controlMeshes = this.getControls(RotationalShape.getRadialControls(calculated));
      mainMeshes = this.renderCurves(RotationalShape.getCurves(calculated));
    }

    if (editorState.mode == 'plane-cutter') {
      const planes = calculated.cuttingPlanes || [];
      const plane = planes[editorState.selectedPlane];
      if (plane) {
        const planeControls = getPlaneControls({
          origin: new Vector3(...plane.origin),
          normal: new Vector3(...plane.normal)
        });
        controlMeshes = [this.planeMesh(plane), ...this.getControls(planeControls)];
      }
    }



    const meshes = [...mainMeshes, 
      ...controlMeshes,
    ];

    if (this.sceneIntersection) {
      const s = this.sceneIntersection.uv.y;
      const t = this.sceneIntersection.uv.x;
      let curve = [];

      if (editorState.mode == 'cross-slicing') {
        curve = RotationalShape.getLineAtS(calculated, s);
      }
      if (editorState.mode == 'radial-slicing') {
        curve = RotationalShape.getLineAtT(calculated, t);
      }

      curve.forEach(({position}) => {
        meshes.push({
          type: Line,
          geometry: {position},
          material: {
            type: LineBasicMaterial, 
            properties: {color: new Color(0xff9900)
            }}
        });
      });

      meshes.push({
        type: Mesh,
        geometry: {type: BoxBufferGeometry, arguments: [1, 1, 1].map(x => x * 0.005)},
        material: {
          type: MeshBasicMaterial, properties: {
            color: new Color(0x00ffff),
            side: THREE.DoubleSide,
            wireframe: false
          }
        },
        
        position: new Vector3().copy(this.sceneIntersection.point)
      });
    }
    return meshes; 

  }

  renderScene() {
    if (!this.props.state.has('currentPart')) {
      return [];
    }
    const part = this.props.state.get('currentPart').toJS();
    if (!part.calculated) {
      return [];
    }

    if (part.stage == 'rough') {
      return this.renderCreatorScene(part.calculated);
    }
    if (part.stage == 'precise') {
      return this.renderEditorScene(part.calculated);
    }
  }

}

