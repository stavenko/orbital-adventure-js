import {toArray, fact} from './Math.js';
import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';
import {patchToWeights} from './Utils.js';




export function split(weights, uvw){
  let max = 3;
  let levels = [weights];
  let levelsIx = [null, 
    [[2,0,0], [1,1,0], [1,0,1],[0,2,0], [0,1,1], [0,0,2]],
    [[1,0,0], [0,1,0], [0,0,1]],
    [[0,0,0]],
]

  for(let c =1; c <= 3; ++c){
    let M = max - c;
    levels[c] = {};
    levelsIx[c].map(([i,j,k])=>{
      let point = new Vector3;
      let key = `${i}${j}${k}`;

      point.add(levels[c-1][`${i+1}${j}${k}`].clone().multiplyScalar(uvw[0]));
      point.add(levels[c-1][`${i}${j+1}${k}`].clone().multiplyScalar(uvw[1]));
      point.add(levels[c-1][`${i}${j}${k+1}`].clone().multiplyScalar(uvw[2]));
      levels[c][key] = point;
    })
  }
  return  {...levels[0], ...levels[1], ...levels[2], ...levels[3]}
}

export function splitPatchWithU0(pointIndex, patch, v){
  let weights = patchToWeights({pointIndex}, patch);
  let levels = split(weights, [0, v, 1.0-v]);

  console.info( levels['012'], levels['002']);
  console.info( levels['021'], levels['020']);
  let t1 = {
    '300': levels['300'].clone(),
    '201': levels['201'].clone(),
    '102': levels['102'].clone(),
    '003': levels['003'].clone(),

    '210': levels['200'].clone(),
    '120': levels['100'].clone(),
    '030': levels['000'].clone(),

    '021': levels['001'].clone(),
    '012': levels['002'].clone(),

    '111': levels['101'].clone(),
  }

  let t2 = {
    '300': levels['300'].clone(),
    '210': levels['210'].clone(),
    '120': levels['120'].clone(),
    '030': levels['030'].clone(),

    '201': levels['200'].clone(),
    '102': levels['100'].clone(),
    '003': levels['000'].clone(),

    '021': levels['020'].clone(),
    '012': levels['010'].clone(),

    '111': levels['110'].clone(),
  }

  let t3 = {
    '030': levels['030'].clone(),
    '021': levels['021'].clone(),
    '012': levels['012'].clone(),
    '003': levels['003'].clone(),

    '300': levels['000'].clone(),
    '210': levels['010'].clone(),
    '120': levels['020'].clone(),

    '102': levels['002'].clone(),
    '201': levels['001'].clone(),

    '111': levels['011'].clone(),
  }

  return [t1,t2,t3]
}

export function getGeometryLineAtT(weights, t, steps){
  let getPoint = BezierPointGetter(weights);
  let points = [];
  let v0 = t;
  for(let i = 0; i <= steps; ++i){
    let u = i/steps;
    let v = (1-u) * v0;
    let w = 1-u-v;
    points.push(...getPoint(u,v,w).toArray());
  }
  let position =toArray(Float32Array, points);
  return {position:{array: position, size: 3}}
}

export function getGeometryLineAtS(weights, s, steps){
  let getPoint = BezierPointGetter(weights);
  let points = [];
  if(weights.way > 0) s = 1.0-s;
  let uv = 1.0 - s;
  for(let i = 0; i <= steps; ++i){
    let u = i/steps * uv;
    let v = 1.0 - u - s;
    points.push(...getPoint(s,u,v).toArray());
  }
  let position =toArray(Float32Array, points);
  return {position:{array: position, size: 3}}

}


export function patchGeometryCreator(multigeometryManager, max){
  let G = multigeometryManager;
  return (patch, patchIndexes, steps=10)=>{
    let way = patch.way;
    let FI = 0, 
      LI = steps, 
      inc = (i)=>i+1;
    if(way > 0){
      FI = steps;
      LI = 0; 
      inc = (i)=>i-1;
    }
    for(let i =FI; i != LI; i=inc(i)){
      for(let j=0; j < steps; ++j){
        let ni = inc(i);
        let nj = (j + 1);
        let lb = getPoint(i,j);
        let lt = getPoint(i,nj);
        let rb = getPoint(ni,j);
        let rt = getPoint(ni,nj);
        let face1, face2;
        if(way> 0){
          face1 = [lb, lt, rt];
          face2 = [lb, rt, rb];
        }else{
          face1 = [lb, rt, lt];
          face2 = [lb, rb, rt];
        }
        G.pushFace(...face1, ...face2);
      }
    }

    function getPoint(i, j){
      return G.getPointIndex(()=>{
        return pointCreator(i, j);
      },((patchIndexes.i*steps)+i)%max.i, ((patchIndexes.j*(steps))+j)%max.j, );
    }

    function uvw(i,j){
      let u = i / steps;
      if(way>0) u=1-u;
      let v = (1-(j / steps))*(1-u);
      let w = 1.0 - v - u;
      return [u,v,w]
    }

    function pointCreator(i, j){
      return getPointBezier(...uvw(i,j), patch);
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


      return {position:point ,tangentS, tangentT, uv, 
        normal: new Vector3().crossVectors(tangentT, tangentS).normalize().negate() };
    }
  }
}

export function getGeometryFromPatch(weights, uvFrom, uvTo, invert, steps = 10){
  let geometry = { indices:[], positions: [],
    faces:[], pointsIx: {}, normals:[], uvs:[] }
  let w=0, u=0, v=0;
  let points = [];
  let lastPointId = 0;
  let patch = weights
  let way = invert
  for(let i =0; i < steps; ++i){
    let to = steps - i;
    let first = getPoint(i  ,0, patch);
    let top   = getPoint(i+1,0, patch);
    let second = getPoint(i, 1, patch);

    let last = getPoint(i,  steps-i, patch);
    let topl = getPoint(i+1,steps-(i+1),patch);
    let preLast = getPoint(i, steps-i-1, patch);
    for(let j=0; j < steps; ++j){
      let ni = (i + 1)
      let nj = (j + 1)
      let lb = getPoint(i,j, patch);
      let lt = getPoint(i,nj, patch);
      let rb = getPoint(ni,j, patch);
      let rt = getPoint(ni,nj, patch);
      let face1, face2;
      if(way> 0){
        face1 = [lb, lt, rt];
        face2 = [lb, rt, rb];
      }else{
        face1 = [lb, rt, lt];
        face2 = [lb, rb, rt];
      }
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
    let v = (j / steps)*(1-u);
    let w = 1.0 - v - u;
    if(u+v+w > 1)
      console.log(u,v,w);
    return [u,v,w]
  }

  function getPointBezier(u,v,w, patch){
    const delta = 0.0001;
    let point = new Vector3;
    //let [uvFrom, uvTo] = patch.uv;

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


  
}

function BezierPointGetter(patch){
  return (u,v,w) => {
    let point = new Vector3;
    let keys = ['300', '210', '201', '120', '111', '102', '030', '021', '012', '003'];
    keys.forEach(key=>{
      let pp = patch[key].clone();
      let k=parseInt(key[0]),
          j=parseInt(key[1]),
          i=parseInt(key[2]);

      point.add(pp.clone().multiplyScalar(Bernstein([i,j,k], [u,v,w])));
    })
    return point;
  }
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
