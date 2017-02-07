import {fact} from './Math.js';
import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';


export function getGeometryFromPatch(weights, steps = 10){
  let geometry = { indices:[], positions: [],
    faces:[], pointsIx: {}, normals:[], uvs:[] }
  let w=0, u=0, v=0;
  let points = [];
  let lastPointId = 0;
  let patch = weights
  let way = patch.way;
  for(let i =0; i < steps; ++i){
    let to = steps - i;
    let first = getPoint(i  ,0, patch);
    let top   = getPoint(i+1,0, patch);
    let second = getPoint(i, 1, patch);
    geometry.indices.push(first, top, second);

    let last = getPoint(i,  steps-i, patch);
    let topl = getPoint(i+1,steps-(i+1),patch);
    let preLast = getPoint(i, steps-i-1, patch);
    if(way < 0)
      geometry.indices.push(last, topl, preLast);
    else
      geometry.indices.push(last, preLast, topl);

    for(let j=0; j < to-1; ++j){
      let ni = (i + 1)
      let nj = (j + 1)
      let lb = getPoint(i,j, patch);
      let lt = getPoint(i,nj, patch);
      let rb = getPoint(ni,j, patch);
      let rt = getPoint(ni,nj, patch);
      let face1, face2;
      if(way> 0){
        face1 = [lb, rt, lt];
        face2 = [lb, rb, rt];
      }else{
        face1 = [lb, lt, rt];
        face2 = [lb, rt, rb];
      }

      let u = i / steps;
      let v = j / steps;
      let w = 1.0 - v - u;

      geometry.indices.push(...face1, ...face2);
    }
  }
  return geometry;

  function getPoint(i,j, patch){
    let key = `${i}${j}`;
    if(geometry.pointsIx[key]) {
      return geometry.pointsIx[key];
    }

    let {point, normal, uv} = getPointBezier(...uvw(i,j), patch);
    geometry.positions.push(...[point.x, point.y, point.z]);
    geometry.normals.push(...[normal.x, normal.y, normal.z]);
    geometry.uvs.push(...[uv.x, uv.y ]);
    let pointId = lastPointId++;
    geometry.pointsIx[key] = pointId;
    return pointId;
  }

  function uvw(i,j){
    let u = i / steps;
    let v = j / steps;
    let w = 1.0 - v - u;
    return [u,v,w]
  }

  function getPointBezier(u,v,w, patch){
    const delta = 0.0001;
    let point = new Vector3;
    let [uvFrom, uvTo] = patch.uv;

    let uvDiff = [0,1].map(i=>uvTo[i] - uvFrom[i]);

    let pT = new Vector3;
    let pS = new Vector3;
    let u1 = u + delta,
        v1 = v + delta;
    if(u - 1 < delta) u1 = u - delta;
    if(v - 1 < delta) v1 = v - delta;

    let keys = ['300', '210', '201', '120', '111', '102', '030', '021', '012', '003'];

    keys.forEach(key=>{
      // let pointId = patch[key];
      let pp = patch[key].clone();
      let k=parseInt(key[0]),
          j=parseInt(key[1]),
          i=parseInt(key[2]);

      point.add(pp.clone().multiplyScalar(Bernstein([i,j,k], [u,v,w])));
      pT.add(pp.clone().multiplyScalar(Bernstein([i,j,k], [u, v1, 1. -u-v1])));
      pS.add(pp.clone().multiplyScalar(Bernstein([i,j,k], [u1, v, 1.0-u1-v])));
    })
    let tangentS = pS.sub(point), 
        tangentT = pT.sub(point);
    if(u1 < u) tangentT.negate();
    if(v1 < v) tangentS.negate();
    let vuw = [u, v, w];

    let MaxR = 1-u; 
    let uT = w/MaxR;
    let vt = u;
    if(way > 0) vt = 1.0-u;
    let uv = new Vector2(uT * uvDiff[0] + uvFrom[0],
                         vt * uvDiff[1] + uvFrom[1]);


    return {point ,tangentS, tangentT, uv, 
      normal: new Vector3().crossVectors(tangentT, tangentS).normalize().negate() };
  }

  function Bernstein(ijk, uvw){
    let [k,j,i] = ijk;
    let [u,v,w] = uvw;

    let n = i+j+k;
    let pows = pow(u,i)* pow(v,j) * pow(w,k);
    return pows * fact(n) / (fact(i)*fact(j)*fact(k));
  }

  function pow(a,p){
    return Math.pow(a,p);
  }

  
}
