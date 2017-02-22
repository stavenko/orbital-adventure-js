import {Vector3} from 'three/src/math/Vector3'
import {BufferGeometry} from 'three/src/core/BufferGeometry.js'
import {BufferAttribute} from 'three/src/core/BufferAttribute.js'

const pi = Math.PI;
const pi2 = pi*2;

export function arrowsOnPath(path, from, to, radius, steps, pathSteps, extraRadiusMultiplier = 1.5, extraPath = pi/9){
  let distance = to-from;
  let pointIndex = {};
  let pointArray = [];
  let normalArray = [];
  let positionAmount = 0;
  let faces = [];
  for(let i =0; i< pathSteps; ++i){
    let nextI = (i+1)%(pathSteps+1);
    let [p,q] = [i, nextI].map(i=>{
      let {point, tangent} = getPointAt(path, from + (i/pathSteps) * distance);
      return circleInPlane({origin:point, normal: tangent}, steps, radius);

    });
    for(let j =0; j < steps; ++j){
      let nj = (j+1)% steps;
      let a = getOrSavePoint(i, j,  p[j].point.clone(), p[j].pointNormal.clone());
      let b = getOrSavePoint(nextI,j,  q[j].point.clone(), p[j].pointNormal.clone());
      let c = getOrSavePoint(nextI,nj, q[nj].point.clone(), p[nj].pointNormal.clone());
      let d = getOrSavePoint(i, nj, p[nj].point.clone(), p[nj].pointNormal.clone());
      faces.push(a,c,b, a,d,c);
    }
  }

  let S = getPointAt(path, from-extraPath);
  let SB = getPointAt(path, from );
  let E = getPointAt(path, to+extraPath);
  let EB = getPointAt(path, to);

  [[S,SB],[E,EB]].forEach(([tipPoint, basePoint],ix)=>{
    let plane = {origin: basePoint.point, normal: basePoint.tangent};

    let pts = circleInPlane(plane, steps, radius*extraRadiusMultiplier);
    let tipPointIndex = getOrSavePoint(['a', 'z'][ix], 't', tipPoint.point.clone(), tipPoint.tangent.clone());

    for(let j =0; j < pts.length; ++j){
      let nj = [j +1] % steps;
      let ca = getOrSavePoint(['a', 'z'][ix], j, pts[j].point, pts[j].pointNormal);
      let cb = getOrSavePoint(['a', 'z'][ix], nj, pts[nj].point, pts[nj].pointNormal);
      let a  = getOrSavePoint([0, pathSteps][ix], j, null);
      let b  = getOrSavePoint([0, pathSteps][ix], nj, null);
      if(ix == 0){
        faces.push(ca, tipPointIndex,  cb);
        faces.push(a,  ca, cb);
        faces.push(a,  cb, b);
      }else {
        faces.push(ca,  cb, tipPointIndex);
        faces.push(a, cb,  ca);
        faces.push(a, b,  cb);
      }
    }
  })

  function getOrSavePoint(i, j, point, normal){
    let key = `${i},${j}`;
    if(pointIndex[key]) return pointIndex[key];
    pointArray.push(point.x);
    pointArray.push(point.y);
    pointArray.push(point.z);
    normalArray.push(normal.x);
    normalArray.push(normal.y);
    normalArray.push(normal.z);
    pointIndex[key] = positionAmount++;
    return pointIndex[key];
  }

  let positions = toArray(Float32Array, pointArray);
  let normals = toArray(Float32Array, normalArray);
  let index = toArray(Uint32Array, faces);
  let geometry = new BufferGeometry();
  geometry.addAttribute('position', new BufferAttribute(positions,3));
  geometry.addAttribute('normal', new BufferAttribute(normals,3, true));
  geometry.setIndex(new BufferAttribute(index,1));
  return {geometry};
}

function getPointAt(path, at){

  if(path.type === 'ray') {
    let ray = path.ray.clone();
    let point =  path.origin.clone().add(ray.clone().multiplyScalar(at));
    return {point, tangent: ray};
  }

  if(path.type === 'circle') {
    let basis = getBasis(path.plane);
    let point = getCirclePoint(basis, at, path.radius);
    let tangent = new Vector3().crossVectors(basis.z, point.clone().sub(path.plane.origin)).normalize();
    return {point, tangent};
  }
}


function getTangent( normal, point){
  return new Vector3().crossVectors(normal, point);
}

function getCirclePoint(basis, angle, radius){
  let p = new Vector3;
  p.add(basis.x.clone().multiplyScalar(radius * Math.cos(angle)));
  p.add(basis.y.clone().multiplyScalar(radius * Math.sin(angle)));
  return p;
}

function getBasis({normal, origin}){
  let z = new Vector3(0,0,1);
  let y = new Vector3(0,1,0);
  let x = new Vector3(1,0,0);

  let ang = normal.angleTo(z)
  let axis = new Vector3().crossVectors(normal, z).normalize();
  y.applyAxisAngle(axis, -ang);
  x.applyAxisAngle(axis, -ang);
  z.applyAxisAngle(axis, -ang);

  return {x,y,z};

}

function circleInPlane({normal, origin}, steps, radius){
  let basis = getBasis({normal, origin});

  let points = [];

  const pi2 = Math.PI * 2;
  for(let i = 0; i < steps; ++i){
    let p  = new Vector3(); // origin.clone();
    let t = i / steps;
    p.add(basis.x.clone().multiplyScalar(radius * Math.cos(t * pi2)));
    p.add(basis.y.clone().multiplyScalar(radius * Math.sin(t * pi2)));
    let t0 = new Vector3().crossVectors(p, basis.z).normalize();

    points.push({point:p.clone().add(origin), tangent:t0, normal, pointNormal:p.clone() });
  }
  return points;

}

function toArray(type, fromArray){
    let array = new type(fromArray.length);
    fromArray.forEach((v,i)=>array[i]=v);
    return array;
}

