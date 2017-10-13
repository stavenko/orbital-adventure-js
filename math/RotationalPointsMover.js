import {Vector3} from 'three/src/math/Vector3';
import {Plane} from 'three/src/math/Plane';
import {Quaternion} from 'three/src/math/Quaternion';
import {recalculateInterpolatedWeights} from './RotationalShape.js';

export class PointsMover {
  constructor(shape, fromEvent, ix, fromRay, constrain, editorMode) {
    this.shape = shape.calculated;
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

  getPointListSlices(pointIndex) {
    const st = pointIndex.split(',');
    const radials = this.shape.radialAmount;
    const slices = this.shape.sliceAmount;
    const hasTopCone = this.shape._initialProps.topCone;
    const hasBottomCone = this.shape._initialProps.bottomCone;

    if (st.length == 1) {
      const pts = [];
      const s = parseInt(st[0]);
      const isBottom = s == 0 && hasBottomCone;
      const isTop = s == slices - 1 && hasTopCone;
      pts.push(st[0]);
      if (isBottom || isTop) {
        if (isBottom) {
          for (let i = 0;i < radials; ++i) {
            pts.push(`${s}+,${i}`);
          }
        }
        if (isTop) {
          for (let i = 0;i < radials; ++i) {
            pts.push(`${s}-,${i}`);
          }
        }
      } else {
        const s = parseInt(st[0]);
        const isBottom = s == 0;
        const isTop = s == slices - 1;
        for (let i = 0; i < radials; ++i) {
          pts.push(`${s},${i}-`);
          pts.push(`${s},${i}`);
          pts.push(`${s},${i}+`);

          
          if (!isTop) {
            pts.push(`${s}+,${i}`);
          }
          if (!isBottom) {
            pts.push(`${s}-,${i}`);
          }
        }
      }

      return pts;
    } else {
      return [pointIndex];
    }
  }

  getPointListRadials(pointIndex) {
    const radials = this.shape.radialAmount;
    const slices = this.shape.sliceAmount;
    const hasTopCone = this.shape._initialProps.topCone;
    const hasBottomCone = this.shape._initialProps.bottomCone;
    const st = pointIndex.split(',');
    const pts = [];
    if (st[1] == 'r') {
      for (let i = 0; i < slices; ++i) {
        if (i == 0 && hasBottomCone) {
          pts.push(`0+,${st[0]}`);
          continue;
        }
        if (i == (slices - 1) && hasTopCone) {
          pts.push(`${i}-,${st[0]}`);
          continue;
        }

        pts.push(`${i},${st[0]}-`);
        pts.push(`${i},${st[0]}`);
        pts.push(`${i},${st[0]}+`);

        if (i < (slices - 1)) {
          pts.push(`${i}+,${st[0]}`);
        }

        if (i > 0) {
          pts.push(`${i}-,${st[0]}`);
        }
      }
      pts.push(pointIndex);
      return pts;
    } else {
      
      return [pointIndex];
    }
    return [];
  }

  getPointList(pointIndex) {
    if (this.editorMode == 'edit-slices') {
      return this.getPointListSlices(pointIndex);
    } else {
      return this.getPointListRadials(pointIndex);
    }
  }

  calculateQuaternion() {
    const rotPlane = new Plane().setFromNormalAndCoplanarPoint( this.constrain.axis.clone(), this.constrain.pivot.clone());
    const from = this.from.intersectPlane(rotPlane);
    const to = this.to.intersectPlane(rotPlane);
    if (!to || !from) {
      return console.warn('incorrect plane');
    }
    const angle = from.angleTo(to);
    const dirAxis = new Vector3().crossVectors(from, to);
    let dir = dirAxis.dot(this.constrain.axis.clone());
    dir = dir / Math.abs(dir);
    return new Quaternion().setFromAxisAngle(this.constrain.axis.clone(), angle * dir);
  }

  movePoint(newPointIndex) {
    // let's create it later;
    // let diff = this.to.clone().sub(this.from);
    const {type, value} = this.constrain;
    const operation = tr => old => old.add(tr);
    let op = () => {};
    switch (type) {
      case 'plane': {
        const pl = new Plane().setFromNormalAndCoplanarPoint(value.normal.clone(), value.origin.clone());
        const from = this.from.intersectPlane(pl);
        const to = this.to.intersectPlane(pl);
        const diff = to.sub(from);
        op = operation(diff);
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
        op = operation(projectedDiff);
        break;
      }
      case 'rotation': {
        const q = this.calculateQuaternion();
        if (!q) {
          op = () => {};
        } else {
          op = old => old.applyQuaternion(q);
        }
        break;
      }

      default:
        console.warn('unknown constrain');
    }
    this.getPointList(this.movingIx)
      .forEach(pix => op(newPointIndex[pix]));
  }

  calculateNewPointIndex() {
    const pi = {};
    for (const ix in this.shape.pointIndex) {
      pi[ix] = this.shape.pointIndex[ix].clone();
    }
    this.movePoint(pi);
    const shp = {...this.shape};
    shp.pointIndex = pi;
    recalculateInterpolatedWeights(shp);
    return pi;
  }

  getPointIndex() {
    return this.calculateNewPointIndex();
  }
}

