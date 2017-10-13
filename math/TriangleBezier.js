import {toArray, fact} from './Math.js';
import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';
import {patchToWeights} from './Utils.js';




export function split(weights, uvw) {
  const max = 3;
  const levels = [weights];
  const levelsIx = [null, 
    [[2, 0, 0], [1, 1, 0], [1, 0, 1], [0, 2, 0], [0, 1, 1], [0, 0, 2]],
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[0, 0, 0]],
  ];

  for (let c = 1; c <= 3; ++c) {
    const M = max - c;
    levels[c] = {};
    levelsIx[c].map(([i, j, k]) => {
      const point = new Vector3;
      const key = `${i}${j}${k}`;

      point.add(levels[c - 1][`${i + 1}${j}${k}`].clone().multiplyScalar(uvw[0]));
      point.add(levels[c - 1][`${i}${j + 1}${k}`].clone().multiplyScalar(uvw[1]));
      point.add(levels[c - 1][`${i}${j}${k + 1}`].clone().multiplyScalar(uvw[2]));
      levels[c][key] = point;
    });
  }
  return {...levels[0], ...levels[1], ...levels[2], ...levels[3]};
}

export function splitPatchWithU0(pointIndex, patch, v) {
  const weights = patchToWeights({pointIndex}, patch);
  const levels = split(weights, [0, v, 1.0 - v]);

  console.info( levels['012'], levels['002']);
  console.info( levels['021'], levels['020']);
  const t1 = {
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
  };

  const t2 = {
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
  };

  const t3 = {
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
  };

  return [t1, t2, t3];
}

export function getGeometryLineAtT(weights, t, steps) {
  const getPoint = BezierPointGetter(weights);
  const points = [];
  const v0 = t;
  for (let i = 0; i <= steps; ++i) {
    const u = i / steps;
    const v = (1 - u) * v0;
    const w = 1 - u - v;
    points.push(...getPoint(u, v, w).toArray());
  }
  const position = toArray(Float32Array, points);
  return {position: {array: position, size: 3}};
}

export function getGeometryLineAtS(weights, s, steps) {
  const getPoint = BezierPointGetter(weights);
  const points = [];
  if (weights.way > 0) {
    s = 1.0 - s;
  }
  const uv = 1.0 - s;
  for (let i = 0; i <= steps; ++i) {
    const u = i / steps * uv;
    const v = 1.0 - u - s;
    points.push(...getPoint(s, u, v).toArray());
  }
  const position = toArray(Float32Array, points);
  return {position: {array: position, size: 3}};

}


export function patchGeometryCreator(multigeometryManager, max) {
  const G = multigeometryManager;
  return (patch, patchIndexes, steps = 10) => {
    const way = patch.way;
    let FI = 0, 
      LI = steps, 
      inc = (i) => i + 1;
    if (way > 0) {
      FI = steps;
      LI = 0; 
      inc = (i) => i - 1;
    }
    for (let i = FI; i != LI; i = inc(i)) {
      for (let j = 0; j < steps; ++j) {
        const ni = inc(i);
        const nj = (j + 1);
        const lb = getPoint(i, j);
        const lt = getPoint(i, nj);
        const rb = getPoint(ni, j);
        const rt = getPoint(ni, nj);
        let face1, face2;
        if (way < 0) {
          face1 = [lb, lt, rt];
          face2 = [lb, rt, rb];
        } else {
          face1 = [lb, rt, lt];
          face2 = [lb, rb, rt];
        }
        G.pushFace(...face1, ...face2);
      }
    }

    function getPoint(i, j) {
      return G.getPointIndex(() => {
        return pointCreator(i, j);
      }, ((patchIndexes.i * steps) + i) % max.i, ((patchIndexes.j * (steps)) + j) % max.j, );
    }

    function uvw(i, j) {
      let u = i / steps;
      if (way > 0) {
        u = 1 - u;
      }
      const v = (1 - (j / steps)) * (1 - u);
      const w = 1.0 - v - u;
      return [u, v, w];
    }

    function pointCreator(i, j) {
      return getPointBezier(...uvw(i, j), patch);
    }

    function getPointBezier(u, v, w, patch) {
      const delta = 0.0001;
      const point = new Vector3;
      const [uvFrom, uvTo] = patch.uv;

      const uvDiff = [0, 1].map(i => uvTo[i] - uvFrom[i]);

      const pT = new Vector3;
      const pS = new Vector3;
      let u1 = u + delta,
        v1 = v + delta;
      if (u - 1 < delta) {
        u1 = u - delta;
      }
      if (v - 1 < delta) {
        v1 = v - delta;
      }

      const keys = ['300', '210', '201', '120', '111', '102', '030', '021', '012', '003'];

      keys.forEach(key => {
        const pp = patch[key].clone();
        let k = parseInt(key[0]),
          j = parseInt(key[1]),
          i = parseInt(key[2]);

        point.add(pp.clone().multiplyScalar(Bernstein([i, j, k], [u, v, w])));
        pT.add(pp.clone().multiplyScalar(Bernstein([i, j, k], [u, v1, 1. - u - v1])));
        pS.add(pp.clone().multiplyScalar(Bernstein([i, j, k], [u1, v, 1.0 - u1 - v])));
      });
      let tangentS = pS.sub(point), 
        tangentT = pT.sub(point);
      if (u1 < u) {
        tangentT.negate();
      }
      if (v1 < v) {
        tangentS.negate();
      }
      const vuw = [u, v, w];

      const MaxR = 1 - u; 
      const uT = w / MaxR;
      let vt = u;
      if (way > 0) {
        vt = 1.0 - u;
      }
      const uv = new Vector2(uT * uvDiff[0] + uvFrom[0],
        vt * uvDiff[1] + uvFrom[1]);


      return {position: point, tangentS, tangentT, uv, 
        normal: new Vector3().crossVectors(tangentT, tangentS).normalize() };
    }
  };
}

export function getGeometryFromPatch(weights, uvFrom, uvTo, invert, steps = 10) {
  const geometry = { indices: [], positions: [],
    faces: [], pointsIx: {}, normals: [], uvs: [] };
  let w = 0, u = 0, v = 0;
  const points = [];
  let lastPointId = 0;
  const patch = weights;
  const way = invert;
  for (let i = 0; i < steps; ++i) {
    const to = steps - i;
    const first = getPoint(i, 0, patch);
    const top = getPoint(i + 1, 0, patch);
    const second = getPoint(i, 1, patch);

    const last = getPoint(i, steps - i, patch);
    const topl = getPoint(i + 1, steps - (i + 1), patch);
    const preLast = getPoint(i, steps - i - 1, patch);
    for (let j = 0; j < steps; ++j) {
      const ni = (i + 1);
      const nj = (j + 1);
      const lb = getPoint(i, j, patch);
      const lt = getPoint(i, nj, patch);
      const rb = getPoint(ni, j, patch);
      const rt = getPoint(ni, nj, patch);
      let face1, face2;
      if (way > 0) {
        face1 = [lb, lt, rt];
        face2 = [lb, rt, rb];
      } else {
        face1 = [lb, rt, lt];
        face2 = [lb, rb, rt];
      }
      geometry.indices.push(...face1, ...face2);
    }
  }
  return geometry;

  function getPoint(i, j, patch) {
    const key = `${i}${j}`;
    if (geometry.pointsIx[key]) {
      return geometry.pointsIx[key];
    }

    const {point, normal, uv} = getPointBezier(...uvw(i, j), patch);
    geometry.positions.push(...[point.x, point.y, point.z]);
    geometry.normals.push(...[normal.x, normal.y, normal.z]);
    geometry.uvs.push(...[uv.x, uv.y ]);
    const pointId = lastPointId++;
    geometry.pointsIx[key] = pointId;
    return pointId;
  }

  function uvw(i, j) {
    const u = i / steps;
    const v = (j / steps) * (1 - u);
    const w = 1.0 - v - u;
    if (u + v + w > 1) {
      console.log(u, v, w);
    }
    return [u, v, w];
  }

  function getPointBezier(u, v, w, patch) {
    const delta = 0.0001;
    const point = new Vector3;
    //let [uvFrom, uvTo] = patch.uv;

    const uvDiff = [0, 1].map(i => uvTo[i] - uvFrom[i]);

    const pT = new Vector3;
    const pS = new Vector3;
    let u1 = u + delta,
      v1 = v + delta;
    if (u - 1 < delta) {
      u1 = u - delta;
    }
    if (v - 1 < delta) {
      v1 = v - delta;
    }

    const keys = ['300', '210', '201', '120', '111', '102', '030', '021', '012', '003'];

    keys.forEach(key => {
      // let pointId = patch[key];
      const pp = patch[key].clone();
      let k = parseInt(key[0]),
        j = parseInt(key[1]),
        i = parseInt(key[2]);

      point.add(pp.clone().multiplyScalar(Bernstein([i, j, k], [u, v, w])));
      pT.add(pp.clone().multiplyScalar(Bernstein([i, j, k], [u, v1, 1. - u - v1])));
      pS.add(pp.clone().multiplyScalar(Bernstein([i, j, k], [u1, v, 1.0 - u1 - v])));
    });
    let tangentS = pS.sub(point), 
      tangentT = pT.sub(point);
    if (u1 < u) {
      tangentT.negate();
    }
    if (v1 < v) {
      tangentS.negate();
    }
    const vuw = [u, v, w];

    const MaxR = 1 - u; 
    const uT = w / MaxR;
    let vt = u;
    if (way > 0) {
      vt = 1.0 - u;
    }
    const uv = new Vector2(uT * uvDiff[0] + uvFrom[0],
      vt * uvDiff[1] + uvFrom[1]);


    return {point, tangentS, tangentT, uv, 
      normal: new Vector3().crossVectors(tangentT, tangentS).normalize().negate() };
  }


  
}

function BezierPointGetter(patch) {
  return (u, v, w) => {
    const point = new Vector3;
    const keys = ['300', '210', '201', '120', '111', '102', '030', '021', '012', '003'];
    keys.forEach(key => {
      const pp = patch[key].clone();
      let k = parseInt(key[0]),
        j = parseInt(key[1]),
        i = parseInt(key[2]);

      point.add(pp.clone().multiplyScalar(Bernstein([i, j, k], [u, v, w])));
    });
    return point;
  };
}

function Bernstein(ijk, uvw) {
  const [k, j, i] = ijk;
  const [u, v, w] = uvw;

  const n = i + j + k;
  const pows = pow(u, i) * pow(v, j) * pow(w, k);
  return pows * fact(n) / (fact(i) * fact(j) * fact(k));
}

function pow(a, p) {
  return Math.pow(a, p);
}
