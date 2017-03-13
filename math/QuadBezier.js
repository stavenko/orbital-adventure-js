import {toArray, fact} from './Math.js';
import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';
import {patchToWeights} from './Utils.js';


function quadInterpolate(p00, p01, p10, p11, s, t){
  let point = new Vector3;
  let sm = 1-s;
  let tm = 1-t;
  point.add(p00.clone().multiplyScalar(sm*tm));
  point.add(p01.clone().multiplyScalar(sm*t));
  point.add(p10.clone().multiplyScalar(s*tm));
  point.add(p11.clone().multiplyScalar(s*t));

  return point;
}

function getLevelsFromWeights(weights, s,t){
  let levels = [weights];
  for(let l = 1; l < 4; ++l){
    let to = 4-l;
    levels[l] = {};
    for(let i =0; i < to; ++i){
      for(let j = 0; j < to; ++j){
        let p = new Vector3;
        let pts = [
          levels[l-1][`${i}${j}`],
          levels[l-1][`${i}${j+1}`],
          levels[l-1][`${i+1}${j}`],
          levels[l-1][`${i+1}${j+1}`]
        ]
        levels[l][`${i}${j}`]=quadInterpolate( ...pts, s, t);
      }
    }
  }
  return levels
}


function lerp(p1, p2, t){
  let d = p2.clone().sub(p1).multiplyScalar(t);
  let p = p1.clone().add(d);
  return p;
}

function splitCurve(p1,p2,p3,p4, s){
  let t1 = lerp(p1,p2, s);
  let t2 = lerp(p2,p3, s);
  let t3 = lerp(p3,p4, s);

  let q1 = lerp(t1,t2, s);
  let q2 = lerp(t2,t3, s);

  let p  = lerp(q1,q2, s);

  return [[p1, t1, q1, p],
    [p,q2,t3,p4]
  ]
}

export function splitS(pointIndex, patch, s){
  let weights = patchToWeights({pointIndex}, patch);
  let [p0, p1, p2, p3] = split(weights, s, 1);
  return [p0, p2];
}

export function splitT(pointIndex, patch, t){
  let weights = patchToWeights({pointIndex}, patch);
  let [p0, p1, p2, p3] = split(weights, 1, t);
  return [p0, p1];
}

export function split(weights, s,t){
  let levels = getLevelsFromWeights(weights, s,t);


  let boundCurves = [
    splitCurve(levels[0]['00'], levels[0]['10'],levels[0]['20'], levels[0]['30'], s),
    splitCurve(levels[0]['03'], levels[0]['13'],levels[0]['23'], levels[0]['33'], s),
    splitCurve(levels[0]['00'], levels[0]['01'],levels[0]['02'], levels[0]['03'], t),
    splitCurve(levels[0]['30'], levels[0]['31'],levels[0]['32'], levels[0]['33'], t),
  ]
  let secondLerps = [
    [
      lerp(levels[1]['00'], levels[1]['10'], s), 
      lerp(levels[1]['10'], levels[1]['20'], s)
    ],
    [
      lerp(levels[1]['00'], levels[1]['01'], t), 
      lerp(levels[1]['01'], levels[1]['02'], t)
    ],
    [
      lerp(levels[1]['02'], levels[1]['12'], s), 
      lerp(levels[1]['12'], levels[1]['22'], s)
    ],
    [
      lerp(levels[1]['20'], levels[1]['21'], t), 
      lerp(levels[1]['21'], levels[1]['22'], t)
    ]


  ]

  let P0 = {
    '00': boundCurves[0][0][0],
    '10': boundCurves[0][0][1],
    '20': boundCurves[0][0][2],
    '30': boundCurves[0][0][3],

    '01': boundCurves[2][0][1],
    '11': levels[1]['00'],
    '21': secondLerps[0][0], //lerp(levels[1]['00'], levels[1]['01'], s),
    '31': lerp(secondLerps[0][0], secondLerps[0][1], s),

    '02': boundCurves[2][0][2],
    '12': secondLerps[1][0],
    '22': levels[2]['00'],
    '32': lerp(levels[2]['00'], levels[2]['10'], s),

    '03': boundCurves[2][0][3],
    '13': lerp(secondLerps[1][0], secondLerps[1][1], t ),
    '23': lerp(levels[2]['00'],levels[2]['01'], t ),
    '33': levels[3]['00']
  }

  let P1= {
    '00': boundCurves[2][1][0],
    '10': lerp(secondLerps[1][0], secondLerps[1][1], t ),
    '20': lerp(levels[2]['00'],levels[2]['01'], t ),
    '30': levels[3]['00'],
          
    '01': boundCurves[2][1][1], 
    '11': secondLerps[1][1],
    '21': levels[2]['01'], 
    '31': lerp(levels[2]['01'], levels[2]['11'], s),
          
    '02': boundCurves[2][1][2], 
    '12': levels[1]['02'],
    '22': secondLerps[2][0],
    '32': lerp(secondLerps[2][0], secondLerps[2][1], s),
          
    '03': boundCurves[1][0][0],
    '13': boundCurves[1][0][1],
    '23': boundCurves[1][0][2],
    '33': boundCurves[1][0][3]
  }

  let P2= {
    '00': boundCurves[0][1][0], 
    '10': boundCurves[0][1][1],
    '20': boundCurves[0][1][2],
    '30': boundCurves[0][1][3],
          
    '01': lerp(secondLerps[0][0], secondLerps[0][1], s),
    '11': secondLerps[0][1],
    '21': levels[1]['20'],
    '31': boundCurves[3][0][1],
          
    '02': lerp(levels[2]['00'], levels[2]['10'], s),
    '12': levels[2]['10'],
    '22': secondLerps[3][0],
    '32': boundCurves[3][0][2],
          
    '03': levels[3]['00'], 
    '13': lerp(levels[2]['10'], levels[2]['11'], t),
    '23': lerp(secondLerps[3][0], secondLerps[3][1], t),
    '33': boundCurves[3][0][3]
  }

  let P3= {
    '00': levels[3]['00'],
    '10': lerp(levels[2]['10'], levels[2]['11'], t),
    '20': secondLerps[3][0],
    '30': boundCurves[3][1][0],
          
    '01': lerp(levels[2]['01'], levels[2]['11'], s),
    '11': levels[2]['11'],
    '21': secondLerps[3][1],
    '31': boundCurves[3][1][1],
          
    '02': secondLerps[2][0],
    '12': lerp(secondLerps[2][0], secondLerps[2][1], s),
    '22': levels[1]['22'],
    '32': boundCurves[3][1][2],
          
    '03': boundCurves[1][1][0], 
    '13': boundCurves[1][1][1], 
    '23': boundCurves[1][1][2], 
    '33': boundCurves[3][1][3],
  }

  return [P0,P1,P2,P3];
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

export function getGeometryLineAtT(weights, s, steps){
  let getPoint = BesierPointGetter(weights);
  let points = [];
  for(let i = 0; i <= steps; ++i){
    let t = i/steps;
    points.push(...getPoint(t,1.0-s).toArray());
  }
  let position =toArray(Float32Array, points);
  return {position:{array: position, size: 3}}

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

export function patchGeometryCreator(multigeometryManager, max){
  let G = multigeometryManager;
  return (patch, patchIndexes, steps=10)=>{
    for(let i = 0; i < steps; ++i){
      for(let j = 0; j< steps; ++j){
        let lb = getPoint(i,j);
        let lt = getPoint(i,j+1);
        let rb = getPoint(i+1,j);
        let rt = getPoint(i+1,j+1);
        let face1 = [lb, lt, rt];
        let face2 = [lb, rt, rb];
        G.pushFace(...face1, ...face2);
      }
    }

    function getPoint(i,j){
      return G.getPointIndex(()=>{
        return pointCreator(i,j);
      }, (patchIndexes.i*steps +i) % max.i, (patchIndexes.j*steps +j)%max.j);
    }

    function pointCreator(i,j){
     return getPointBezier(...ts(i,j));
    }

    function ts(i,j){
      return [i/steps, j/steps];
    }

    function getPointBezier(t,s){
      const delta = 0.0001;
      let point = new Vector3;
      let [uvFrom, uvTo] = patch.uv;
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

      return {position:point, tangentS, tangentT, uv,
        normal: new Vector3().crossVectors(tangentT, tangentS).normalize()
      };
    }
  }
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
      let face1 = [lb, lt, rt];
      let face2 = [lb, rt, rb];
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

