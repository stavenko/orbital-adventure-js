import {Vector3} from 'three/src/math/Vector3';
import {Plane} from 'three/src/math/Plane';
import {Quaternion} from 'three/src/math/Quaternion';

export class PointsMover{
  constructor(shape, fromEvent, ix, fromRay, constrain, editorMode){
    this.shape = shape.calculated;
    this.movingIx = ix;
    this.from = fromRay;
    this.to = fromRay;
    this.constrain = constrain;
    this.editorMode = editorMode;
    this.fromEvent = fromEvent;
  }

  move(toRay, e){
    this.to = toRay;
    this.toEvent = e
  }


  calculatPlaneProjection(v, plane){
    let ps = plane.normal.clone().dot(v);
    let pv = plane.normal.clone().multiplyScalar(ps); 
    return v.clone().sub(pv);

  }

  calculateVectorProjection(v, vector){
    let nv = vector.clone().normalize();
    let vs = nv.dot(v);
    return nv.multiplyScalar(vs);
  }

  getPointListSlices(pointIndex){
    let st = pointIndex.split(',');
    let radials = this.shape.radialAmount;
    let slices = this.shape.sliceAmount;
    let hasTopCone = this.shape._initialProps.topCone;
    let hasBottomCone = this.shape._initialProps.bottomCone;

    if(st.length == 1){
      let pts = [];
      let s = parseInt(st[0]);
      let isBottom = s == 0 && hasBottomCone;
      let isTop = s == slices-1 && hasTopCone
      pts.push(st[0]);
      if(isBottom || isTop){
        if(isBottom){
          for(let i =0;i<radials; ++i){
            pts.push(`${s}+,${i}`);
          }
        }
        if(isTop){
          for(let i =0;i<radials; ++i){
            pts.push(`${s}-,${i}`);
          }
        }
      }else{
        let s = parseInt(st[0]);
        let isBottom = s == 0;
        let isTop = s == slices-1;
        for(let i = 0; i < radials; ++i){
          pts.push(`${s},${i}-`);
          pts.push(`${s},${i}`);
          pts.push(`${s},${i}+`);

          
          if(!isTop)
            pts.push(`${s}+,${i}`);
          if(!isBottom)
            pts.push(`${s}-,${i}`);
        }
      }

      return pts;
    }else 
      return [pointIndex];
  }

  getPointListRadials(pointIndex){
    let radials = this.shape.radialAmount;
    let slices = this.shape.sliceAmount;
    let hasTopCone = this.shape._initialProps.topCone;
    let hasBottomCone = this.shape._initialProps.bottomCone;
    let st = pointIndex.split(',')
    let pts = [];
    if(st[1] == 'r') {
      for(let i =0; i < slices; ++i){
        if(i == 0 && hasBottomCone){
          pts.push(`0+,${st[0]}`);
          continue;
        }
        if(i == (slices - 1) && hasTopCone){
          pts.push(`${i}-,${st[0]}`)
          continue;
        }

        pts.push(`${i},${st[0]}-`);
        pts.push(`${i},${st[0]}`);
        pts.push(`${i},${st[0]}+`);

        if(i < (slices -1))
          pts.push(`${i}+,${st[0]}`);

        if(i > 0)
          pts.push(`${i}-,${st[0]}`);
      }
      return pts;
    }else{
      
      return [pointIndex];
    }
    return [];
  }

  getPointList(pointIndex){
    if(this.editorMode == 'edit-slices')
      return this.getPointListSlices(pointIndex);
    else 
      return this.getPointListRadials(pointIndex);
  }

  calculateQuaternion(){
    let rotPlane = new Plane().setFromNormalAndCoplanarPoint( this.constrain.axis.clone(), this.constrain.pivot.clone());
    let from = this.from.intersectPlane(rotPlane);
    let to = this.to.intersectPlane(rotPlane);
    if(!to || !from) return console.warn('incorrect plane');
    let angle = from.angleTo(to);
    let dirAxis = new Vector3().crossVectors(from,to);
    let dir = dirAxis.dot(this.constrain.axis.clone());
    dir = dir / Math.abs(dir);
    return new Quaternion().setFromAxisAngle(this.constrain.axis.clone(), angle * dir);
  }

  movePoint(newPointIndex){
    // let's create it later;
    // let diff = this.to.clone().sub(this.from);
    let {type, value} = this.constrain;
    let operation =tr=>old=>old.add(tr);
    let op = ()=>{};
    switch(type){
      case 'plane':{
        let pl = new Plane().setFromNormalAndCoplanarPoint(value.normal.clone(), value.origin.clone());
        let from = this.from.intersectPlane(pl);
        let to = this.to.intersectPlane(pl);
        let diff = to.sub(from);
        op = operation(diff);
        break;
      }
      case 'vector':{
        let {vector, plane} = value;
        let vPlane = new Plane().setFromNormalAndCoplanarPoint(plane.normal, plane.origin);
        let from = this.from.intersectPlane(vPlane);
        let to = this.to.intersectPlane(vPlane);
        if(!to || !from) return console.warn('incorrect plane');
        let diff = to.sub(from);
        let projectedDiff = this.calculateVectorProjection(diff, vector);
        op = operation(projectedDiff);
        break;
      }
      case 'rotation':{
        let q = this.calculateQuaternion();
        if(!q) op = ()=>{};
        else op = old => old.applyQuaternion(q);
        break;
      }

      default:
        console.warn('unknown constrain');
    }
    this.getPointList(this.movingIx)
      .forEach(pix=>op(newPointIndex[pix]));
  }

  calculateNewPointIndex(){
    let pi = {};
    for(let ix in this.shape.pointIndex){
      pi[ix] = this.shape.pointIndex[ix].clone();
    }
    this.movePoint(pi);
    return pi;
  }
  getPointIndex(){
    return this.calculateNewPointIndex();
  }
}

