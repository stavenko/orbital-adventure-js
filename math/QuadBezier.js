import {toArray, fact} from './Math.js';
import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';

export function slice(weights, st){
}

export function getWeights(patch, part){
  let weights = [];
  for(let i=0; i<4; ++i){
    for(let j=0; j<4; ++j){
      let k = `${i}${j}`;
      let point = part.pointIndex[patch[k]].clone();
      weights[i*4+j] = point;
    }
  }
  return weights;
}

export function getGeometryLineAtS(weights, s, steps){
  let getPoint = BesierPointGetter(weights);
  let points = [];
  for(let i = 0; i <= steps; ++i){
    let t = i/steps;
    points.push(...getPoint(s,t).toArray());
  }
  let position =toArray(Float32Array, points);
  return {position:{array: position, size: 3}}

}

export function getGeometryFromPatch(weights, uvFrom, uvTo, steps = 10){

  let patch = weights
  let geometry = {indices:[], positions:[], pointsIx:{}, 
    normals:[], tangentS:[], tangentT:[], uvs:[]}
  let lastPointId = 0;
  for(let i = 0; i < steps; ++i){
    for(let j = 0; j< steps; ++j){
      let lb = getPoint(i,j);
      let lt = getPoint(i,j+1);
      let rb = getPoint(i+1,j);
      let rt = getPoint(i+1,j+1);
      let face1 = [lb, rt, lt];
      let face2 = [lb, rb, rt];
      geometry.indices.push(...face1, ...face2);
    }
  }

  return geometry;
  function getPoint(i,j){
    let key = `${i}${j}`;
    if(geometry.pointsIx[key]) {
      return geometry.pointsIx[key];
    }

    let {point, normal, tangentT, tangentS,uv} = getPointBezier(...ts(i,j));
    geometry.positions.push(...[point.x, point.y, point.z]);
    geometry.normals.push(...[normal.x, normal.y, normal.z]);
    geometry.tangentS.push(...[tangentS.x, tangentS.y, tangentS.z]);
    geometry.tangentT.push(...[tangentT.x, tangentT.y, tangentT.z]);
    geometry.uvs.push(...[uv.x, uv.y]);
    let pointId = lastPointId++;
    geometry.pointsIx[key] = pointId;
    return pointId;
  }
  function ts(i,j){
    return [i/steps, j/steps];
  }

  function getPointBezier(t,s){
    const delta = 0.0001;
    let point = new Vector3;
    //let [uvFrom, uvTo] = patch.uv;
    let uvDist = [0,1].map(i=>uvTo[i] - uvFrom[i]);
    let ts = [ s, t];
    let pT = new Vector3;
    let pS = new Vector3;
    let t1 = t + delta,
        s1 = s + delta;
    if(t - 1 < delta) t1 = t - delta;
    if(s - 1 < delta) s1 = s - delta;
    
    for(let i = 0; i < 4; ++i){
      for(let j=0;j<4; ++j){
        let key = `${i}${j}`;
        //let pointId = patch[key];
        let pp = patch[key].clone();
        let bi = Bernstein(4, i, t);
        let bi1 = Bernstein(4, i, t1);
        let bj = Bernstein(4, j, s); 
        let bj1 = Bernstein(4, j, s1); 
        point.add(pp.clone().multiplyScalar(bi*bj));
        pT.add(pp.clone().multiplyScalar(bi1*bj));
        pS.add(pp.clone().multiplyScalar(bi*bj1));
      }
    }
    let tangentS = pS.sub(point), 
        tangentT = pT.sub(point);
    if(t1 < t) tangentT.negate();
    if(s1 < s) tangentS.negate();

    let uv = new Vector2(...[0,1].map(i=>uvDist[i]*ts[i] + uvFrom[i]));

    return {point, tangentS, tangentT, uv,
      normal: new Vector3().crossVectors(tangentT, tangentS).normalize()
    };
  }

}

function BesierPointGetter(weights){
  return (t,s)=>{
    let point = new Vector3;
    for(let i = 0; i < 4; ++i){
      for(let j=0;j<4; ++j){
        let key = `${i}${j}`;
        let pp = weights[key].clone();
        let bi = Bernstein(4, i, t);
        let bj = Bernstein(4, j, s); 
        point.add(pp.clone().multiplyScalar(bi*bj));
      }
    }
    return point;
  }
}


function Bernstein(n,i,z){
  n=n-1;
  let ni = fact(n) / (fact(i) * fact(n-i))
  let B = ni * Math.pow(z, i) * Math.pow(1-z, n-i); 
  return B;
}

