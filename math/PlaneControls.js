import {Quaternion} from 'three/src/math/Quaternion';
import {Plane} from 'three/src/math/Plane';
import {Vector3} from 'three/src/math/Vector3';

export class PlaneModifier{
  constructor(plane, fromEvent, ix, fromRay, constrain, editorMode){
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

  calculateQuaternion(){
    let rotPlane = new Plane().setFromNormalAndCoplanarPoint( this.constrain.axis.clone(), this.constrain.pivot.clone());
    let from = this.from.intersectPlane(rotPlane).sub(this.constrain.pivot);
    let to = this.to.intersectPlane(rotPlane).sub(this.constrain.pivot);
    if(!to || !from) return console.warn('incorrect plane');
    let angle = from.angleTo(to);
    if(angle == 0) return new Quaternion();
    let dirAxis = new Vector3().crossVectors(from,to).normalize();
    let dir = dirAxis.dot(this.constrain.axis.clone());
    dir = dir / Math.abs(dir);
    return new Quaternion().setFromAxisAngle(this.constrain.axis.clone(), angle * dir);
  }

  movePoint(newPlane){
    let {type, value} = this.constrain;
    switch(type){
      case 'plane':{
        let pl = new Plane().setFromNormalAndCoplanarPoint(value.normal.clone(), value.origin.clone());
        let from = this.from.intersectPlane(pl);
        let to = this.to.intersectPlane(pl);
        let diff = to.sub(from);
        newPlane.origin.add(diff);
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
        newPlane.origin.add(projectedDiff);
        break;
      }

      case 'rotation':{
        let q = this.calculateQuaternion();
        if(!q) return;
        newPlane.normal.applyQuaternion(q);
        break;
      }

      default:
        console.warn('unknown constrain');
    }


  }

  calculateNewPlane(){
    let newPlane = Object.assign({}, this.plane, {
      origin: this.plane.origin.clone(),
      normal: this.plane.normal.clone()
    });
    this.movePoint(newPlane);
    return newPlane;
  }

  getPlane(){
    let np =  this.calculateNewPlane();
    return  np;
  }
}

export function getPlaneControls(plane){
  let x = new Vector3(1,0,0);
  let y = new Vector3(0,1,0);
  let z = new Vector3(0,0,1);
  let as = [x,y,z];
  let bestAxis = as.map((c,ix)=>[c.dot(plane.normal),ix]).sort((a,b)=>a[0]-b[0]);
  let X = bestAxis[0];
  X = as[X[1]].clone().sub(plane.normal.clone().multiplyScalar(X[0])).normalize();
  let Y = new Vector3().crossVectors(plane.normal.clone(), X).normalize();
  let O = plane.origin.clone();
  let dist = 0.25;
  return[
    {
      point: X.clone().multiplyScalar(dist).add(O),
      ix: 'x' ,
      constrain:{
        type: 'rotation',
        pivot: O.clone(),
        axis: Y.clone()
      }
    },
    {
      point: X.clone().multiplyScalar(-dist).add(O),
      ix: 'x',
      constrain:{
        type: 'rotation',
        pivot: O.clone(),
        axis: Y.clone()
      }
    },
    {
      point: Y.clone().multiplyScalar(dist).add(O),
      ix: 'y',
      constrain:{
        type: 'rotation',
        pivot: O.clone(),
        axis: X.clone()
      }
    },
    {
      point: Y.clone().multiplyScalar(-dist).add(O),
      ix: 'y',
      constrain:{
        type: 'rotation',
        pivot: O.clone(),
        axis: X.clone()
      }
    },
    {
      point: O.clone(),
      ix:'o',
      constrain:{
        type:'vector',
        value:{
          plane:{
            origin: O.clone(),
            normal: Y.clone()
          },
          vector: plane.normal.clone()
        }
      }

    }
  ]

  


}
