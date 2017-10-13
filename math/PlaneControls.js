import {Quaternion} from 'three/src/math/Quaternion';
import {Plane} from 'three/src/math/Plane';
import {Vector3} from 'three/src/math/Vector3';

export class PlaneModifier {
  constructor(plane, fromEvent, ix, fromRay, constrain, editorMode) {
    this.plane = plane;
    this.plane.normal = new Vector3(...this.plane.normal);
    this.plane.origin = new Vector3(...this.plane.origin);
    this.movingIx = ix;
    this.from = fromRay;
    this.to = fromRay;
    this.constrain = constrain;
    this.editorMode = editorMode;
    this.fromEvent = fromEvent;
  }

  move(toRay, e) {
    this.to = toRay;
    this.toEvent = e;
  }


  calculatPlaneProjection(v, plane) {
    const ps = plane.normal.clone().dot(v);
    const pv = plane.normal.clone().multiplyScalar(ps); 
    return v.clone().sub(pv);
  }

  calculateVectorProjection(v, vector) {
    const nv = vector.clone().normalize();
    const vs = nv.dot(v);
    return nv.multiplyScalar(vs);
  }

  calculateQuaternion() {
    const rotPlane = new Plane().setFromNormalAndCoplanarPoint( this.constrain.axis.clone(), this.constrain.pivot.clone());
    const from = this.from.intersectPlane(rotPlane).sub(this.constrain.pivot);
    const to = this.to.intersectPlane(rotPlane).sub(this.constrain.pivot);
    if (!to || !from) {
      return console.warn('incorrect plane');
    }
    const angle = from.angleTo(to);
    if (angle == 0) {
      return new Quaternion();
    }
    const dirAxis = new Vector3().crossVectors(from, to).normalize();
    let dir = dirAxis.dot(this.constrain.axis.clone());
    dir = dir / Math.abs(dir);
    return new Quaternion().setFromAxisAngle(this.constrain.axis.clone(), angle * dir);
  }

  movePoint(newPlane) {
    const {type, value} = this.constrain;
    switch (type) {
      case 'plane': {
        const pl = new Plane().setFromNormalAndCoplanarPoint(value.normal.clone(), value.origin.clone());
        const from = this.from.intersectPlane(pl);
        const to = this.to.intersectPlane(pl);
        const diff = to.sub(from);
        newPlane.origin.add(diff);
        break;
      }
      case 'vector': {
        const {vector, plane} = value;
        const vPlane = new Plane().setFromNormalAndCoplanarPoint(plane.normal, plane.origin);
        const from = this.from.intersectPlane(vPlane);
        const to = this.to.intersectPlane(vPlane);
        if (!to || !from) {
          return console.warn('incorrect plane');
        }
        const diff = to.sub(from);
        const projectedDiff = this.calculateVectorProjection(diff, vector);
        newPlane.origin.add(projectedDiff);
        break;
      }

      case 'rotation': {
        const q = this.calculateQuaternion();
        if (!q) {
          return;
        }
        newPlane.normal.applyQuaternion(q);
        break;
      }

      default:
        console.warn('unknown constrain');
    }


  }

  calculateNewPlane() {
    const newPlane = Object.assign({}, this.plane, {
      origin: this.plane.origin.clone(),
      normal: this.plane.normal.clone()
    });
    this.movePoint(newPlane);
    return newPlane;
  }

  getPlane() {
    const np = this.calculateNewPlane();
    return np;
  }
}

export function getPlaneControls(plane) {
  const x = new Vector3(1, 0, 0);
  const y = new Vector3(0, 1, 0);
  const z = new Vector3(0, 0, 1);
  const as = [x, y, z];
  const bestAxis = as.map((c, ix) => [c.dot(plane.normal), ix]).sort((a, b) => a[0] - b[0]);
  let X = bestAxis[0];
  X = as[X[1]].clone().sub(plane.normal.clone().multiplyScalar(X[0])).normalize();
  const Y = new Vector3().crossVectors(plane.normal.clone(), X).normalize();
  const O = plane.origin.clone();
  const dist = 0.25;
  return [
    {
      point: X.clone().multiplyScalar(dist).add(O),
      ix: 'x',
      constrain: {
        type: 'rotation',
        pivot: O.clone(),
        axis: Y.clone()
      }
    },
    {
      point: X.clone().multiplyScalar(-dist).add(O),
      ix: 'x',
      constrain: {
        type: 'rotation',
        pivot: O.clone(),
        axis: Y.clone()
      }
    },
    {
      point: Y.clone().multiplyScalar(dist).add(O),
      ix: 'y',
      constrain: {
        type: 'rotation',
        pivot: O.clone(),
        axis: X.clone()
      }
    },
    {
      point: Y.clone().multiplyScalar(-dist).add(O),
      ix: 'y',
      constrain: {
        type: 'rotation',
        pivot: O.clone(),
        axis: X.clone()
      }
    },
    {
      point: O.clone(),
      ix: 'o',
      constrain: {
        type: 'vector',
        value: {
          plane: {
            origin: O.clone(),
            normal: Y.clone()
          },
          vector: plane.normal.clone()
        }
      }

    }
  ];

  


}
