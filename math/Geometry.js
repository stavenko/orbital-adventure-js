import {patchToWeights} from './Utils.js';
import {MultigeometryManager} from './MultigeometryManager.js';
import {Vector3} from 'three/src/math/Vector3';
import {BufferGeometry} from 'three/src/core/BufferGeometry';
import {BufferAttribute} from 'three/src/core/BufferAttribute';
import {toArray} from './Math.js';
import * as Quad from './QuadBezier.js';
import * as Triangle from './TriangleBezier.js';
import isEqual from 'lodash/isEqual';
import * as GeometryManager from '../GeometryManager.js';


export function getLodGeometry(n) {
  const pg = new PlaneGeometry({
    normal: new Vector3(0, 0, -1), 
    origin: new Vector3(0, 0, 0),
    basis: {
      x: new Vector3(1, 0, 0),
      y: new Vector3(0, 1, 0)
    }
  }, 1, 1, n);
  return pg;
}

export function PlaneCutGeometry(geometryDescriptor, planes) {
  BufferGeometry.call(this);
  this.type = 'PlaneCutGeometry';

  const geometry = GeometryManager.getOrCreateGeometry(geometryDescriptor);
  if (!planes) {
    Object.assign(this.attributes, geometry.attributes);
    this.index = geometry.index;
    return;
  }

  planes.forEach(plane => {
    const [intersected, deletedIx, deletedFa] = findFaces(geometry.index, geometry.attributes.position, plane);
    const [newFaces, pointCircle] = cutFaces(geometry.attributes, intersected, plane);
    const [attributeLists, indexList] = putNewFaces(newFaces, geometry.index, geometry.attributes);
    const [newIndex, newArrays] = removeDeletedFaces(deletedIx, deletedFa, indexList, attributeLists, geometry.attributes, geometry.index);

    const circleList = connectCircle(pointCircle);
    geometry.setIndex(new BufferAttribute(toArray(Uint16Array, newIndex), 1));
    for (const k in newArrays) {
      const oldAttr = geometry.attributes[k];
      geometry.addAttribute(k, new BufferAttribute(toArray(Float32Array, newArrays[k]), oldAttr.itemSize));
    }
  });

  this.setIndex(geometry.index);
  Object.assign(this.attributes, geometry.attributes);
}

PlaneCutGeometry.prototype = Object.create(BufferGeometry.prototype);
PlaneCutGeometry.prototype.constructor = BufferGeometry;

function putNewFaces(newFaces, index, attributes) {
  const count = attributes.position.count;
  const additionalAttributes = {};
  const unique = [];
  const addIndex = [];
  Object.keys(attributes).forEach(a => additionalAttributes[a] = []);
  newFaces.forEach(face => {
    const faceIx = face.map(pointData => {
      if (pointData.ix !== undefined) {
        return pointData.ix;
      }
      return pushPoint(pointData);
    });
    addIndex.push(...faceIx);
  });
  const returnable = {};
  for (const key in attributes) {
    const array = mergeArrays(attributes[key].array, additionalAttributes[key]);
    returnable[key] = array;
  }
  const newIndex = mergeArrays(index.array, addIndex);
  return [returnable, newIndex];

  function pushPoint(pt) {
    const uniqueIx = unique.findIndex(p => isEqual(p, pt));
    if (uniqueIx === -1) {
      unique.push(pt);
      putInArrays(pt);
      return unique.length - 1 + count;
    }
    return uniqueIx + count;
  }

  function putInArrays(pt) {
    for (const k in pt) {
      additionalAttributes[k].push(...pt[k]);
    }
  }

}

function mergeArrays(array, list) {
  // let totalCount = array.length + list.length;
  const newArray = []; 
  
  for (let i = 0; i < array.length; ++i) {
    newArray.push(array[i]);
  }
  for (let i = 0;i < list.length; ++i) {
    newArray.push(list[i]);
  }
  return newArray;
}

function removeDeletedFaces(deletedIx, deletedFa, index, arrays, attributes) {
  const deletion = new Map; // (positionId)=>decreaseShift
  const newIndex = [];
  const newArrays = {};
  let currentMinoring;
  const was = 0;
  const become = 0;

  for (let i = 0; i < (index.length / 3); ++i) {
    const ix = i * 3;
    if (deletedFa.has(ix)) {
      continue;
    }
    newIndex.push(...index.slice(ix, ix + 3).map(j => {
      let denom = deletedIx.findIndex(a => j < a);
      if (denom == -1) {
        denom = deletedIx.length;
      }
      //else denom -= 1;
      return j - denom;
    }));
  }

  for (const key in arrays) {
    newArrays[key] = [];
  }
  const arrayCount = arrays.position.length / attributes.position.itemSize;

  for (let i = 0; i < arrayCount; ++i) {
    
    if (deletedIx.indexOf(i) !== -1) {
      continue;
    }

    for (const key in arrays) {
      const array = arrays[key];
      const attr = attributes[key];
      const ix = i * attr.itemSize;
      newArrays[key].push(...array.slice(ix, ix + attr.itemSize));
    }
  }
  return [newIndex, newArrays];

}

function findFaces(index, position, plane) {
  const intersectedFaces = [];
  const deletedIndexes = new Set;
  const deletedFaces = new Set;
  const pa = position.array;
  const ps = position.itemSize;
  const o = plane.origin;
  const n = plane.normal;
  for (let i = 0; i < index.count; ++i) {
    const ix = i * 3;
    const face = [...index.array.slice(ix, ix + 3)];
    const vertices = face.map(j => pa.slice(j * ps, j * ps + ps));
    const dots = vertices.map(v => [0, 1, 2].map(ix => (v[ix] - o[ix]) * n[ix]).reduce((a, v) => a + v, 0));
    let hasDeleted = 0;
    dots.forEach((dot, id) => {
      if (dot < 0) {
        return;
      }
      deletedIndexes.add(face[id]);
      ++hasDeleted;
    });
    if (hasDeleted > 0) {
      if (hasDeleted < 3) {
        intersectedFaces.push(face);
      }
      deletedFaces.add(ix);
    }
  }
  const deletedIx = [...deletedIndexes.entries()].map(a => a[0]).sort((a, b) => a - b);
  return [intersectedFaces, deletedIx, deletedFaces];
}

const indexes = [
  [],
  [0],
  [0, 1],
  [0, 1, 2]
];

function vecDistance(a, b, s = 3) {
  return indexes[s].map(i => Math.pow(a[i] - b[i], 2)).reduce((a, b) => a + b, 0);
}

function vecEqual(a, b) {
  // console.log(vecDistance(a,b));
  return vecDistance(a, b) < 1e-4;
}

function connectCircle(circle) {
  const first = circle.shift();
  const list = [first.to, first.from];
  while (circle.length != 0) {
    const way = 1;
    let switchPair = false;
    const last = list[list.length - 1];
    let nextIx = circle.findIndex(({from, to}) => vecEqual(from, last));
    if (nextIx == -1) {
      nextIx = circle.findIndex(({from, to}) => vecEqual(to, last));
      switchPair = true;
      console.log('switch pair +', nextIx);
    }
    if (nextIx === -1) {
      const first = list[0];
      nextIx = circle.findIndex(({from, to}) => vecEqual(to, first));
      const way = -1;
      console.warn('other way', nextIx);
      if (nextIx == -1) {
        nextIx = circle.findIndex(({from, to}) => vecEqual(from, first));
        switchPair = true;
        console.log('switch pair-', nextIx);
      }

    }
    if (nextIx == -1) {
      break;
    }
    console.log('---------------------------');
    if (way > 0) {
      const [next] = circle.splice(nextIx, 1);
      if (switchPair) {
        list.push(next.from);
      } else {
        list.push(next.to);
      }
    } else {
      const [next] = circle.splice(nextIx, 1);
      if (switchPair) {
        list.unshift(next.to);
      } else {
        list.unshift(next.from);
      }
    }
  }
  return list;

}

function cutFaces(attributes, intersectedFaces, plane) {
  const position = attributes.position;
  const otherAttrs = Object.keys(attributes).filter(a => a != 'position');
  const pa = position.array;
  const ps = position.itemSize;
  const o = plane.origin;
  const n = plane.normal;
  const newFaces = [];
  const circle = [];
  for (let i = 0; i < intersectedFaces.length; ++i) {
    const face = intersectedFaces[i];
    const vertices = face.map(j => pa.slice(j * ps, j * ps + ps));
    const ix = vertices.findIndex(v => dotPlane(v, o, n) < 0);
    const rFace = [ix, ix + 1, ix + 2].map(j => face[j % 3]);
    const [B, V0, V1] = rFace.map(j => pa.slice(j * ps, j * ps + ps));
    // B now is below plane;
    const V0upper = dotPlane(V0, o, n) > 0;
    const V1upper = dotPlane(V1, o, n) > 0;
    
    if (V0upper && V1upper) {
      const [e0, e1] = [V0, V1].map(v => [0, 1, 2].map(j => v[j] - B[j]));
      const t1 = rayPlane(B, e0, o, n);
      const t2 = rayPlane(B, e1, o, n);

      const p1 = [0, 1, 2].map(j => e0[j] * t1 + B[j]);
      const p2 = [0, 1, 2].map(j => e1[j] * t2 + B[j]);
      newFaces.push([{ix: rFace[0]}, 
        Object.assign({position: p1}, lerpAttrs(t1, rFace[0], rFace[1])), 
        Object.assign({position: p2}, lerpAttrs(t1, rFace[0], rFace[2])) ]);
      circle.push({from: p1, to: p2});
    } else if (V0upper && !V1upper) {
      const e0 = [0, 1, 2].map(j => V0[j] - B[j]);
      const e1 = [0, 1, 2].map(j => V1[j] - V0[j]);
      const t1 = rayPlane(B, e0, o, n);
      const t2 = rayPlane(V0, e1, o, n);
      const p1 = [0, 1, 2].map(j => e0[j] * t1 + B[j]);
      const p2 = [0, 1, 2].map(j => e1[j] * t2 + V0[j]);
      newFaces.push([{ix: rFace[0]},
        Object.assign({position: p1}, lerpAttrs(t1, rFace[0], rFace[1])),
        Object.assign({position: p2}, lerpAttrs(t2, rFace[1], rFace[2]))]);
      newFaces.push([{ix: rFace[0]},
        Object.assign({position: p2}, lerpAttrs(t2, rFace[1], rFace[2])),
        {ix: rFace[2]}]);
      circle.push({from: p1, to: p2});
    } else if (V1upper && !V0upper) {
      const e0 = [0, 1, 2].map(j => V1[j] - V0[j]);
      const e1 = [0, 1, 2].map(j => V1[j] - B[j]);
      const t1 = rayPlane(V0, e0, o, n);
      const t2 = rayPlane(B, e1, o, n);
      const p1 = [0, 1, 2].map(j => e0[j] * t1 + V0[j]);
      const p2 = [0, 1, 2].map(j => e1[j] * t2 + B[j]);
      newFaces.push([{ix: rFace[0]},
        Object.assign({position: p1}, lerpAttrs(t1, rFace[1], rFace[2] )),
        Object.assign({position: p2}, lerpAttrs(t2, rFace[0], rFace[2] ))

      ]);
      newFaces.push([
        {ix: rFace[0]}, 
        {ix: rFace[1]}, 
        Object.assign({position: p1}, lerpAttrs(t1, rFace[1], rFace[2] )),
      ]
      );
      circle.push({from: p1, to: p2});
    } else {
      
    }
  }
  return [newFaces, circle];
  function lerpAttrs(t, fid, tid) {
    const vals = {};
    otherAttrs.forEach(attr => {
      const attribute = attributes[attr];
      const fix = fid * attribute.itemSize;
      const tix = tid * attribute.itemSize;
      const from = attribute.array.slice(fix, fix + attribute.itemSize);
      const to = attribute.array.slice(fix, fix + attribute.itemSize);
      const nums = indexes[attribute.itemSize];
      vals[attr] = nums.map(i => (to[i] - from[i]) * t + from[i]);
    });
    return vals;
  }

}

function rayPlane(ro, e, o, n) {
  const u = [0, 1, 2].map(j => n[j] * (o[j] - ro[j])).reduce((a, b) => a + b);
  const d = [0, 1, 2].map(j => n[j] * e[j]).reduce((a, b) => a + b);
  return u / d;

}

function dotPlane(v, o, n) {
  return [0, 1, 2].map(ix => (v[ix] - o[ix]) * n[ix]).reduce((a, b) => a + b, 0);
}

export function PlaneGeometry(plane, sizex, sizey, steps = 10) {
  BufferGeometry.call(this);
  this.type = 'PlaneGeometry';
  const x = new Vector3(1, 0, 0);
  const y = new Vector3(0, 1, 0);
  const z = new Vector3(0, 0, 1);
  const pn = new Vector3(...plane.normal);
  const po = new Vector3(...plane.origin);

  const dots = [x, y, z].map(v => v.dot(pn)).map((d, ix) => [d, ix]).sort((a, b) => b[0] - a[0]);
  const best = [x, y, z][dots[0][1]];
  let px, py;
  if (!plane.basis) {
    px = best.sub(pn.clone().multiplyScalar(dots[0][0])).normalize(); 
    py = new Vector3().crossVectors(pn, px).normalize();
  } else {
    px = plane.basis.x.clone();
    py = plane.basis.y.clone();
  }
  const pIndex = {};
  const positions = [];
  const faces = [];
  let incr = 0;
  for (let i = 0; i < steps; ++i) {
    for (let j = 0; j < steps; ++j) {
      const s = i / steps - 0.5;
      const t = j / steps - 0.5;
      const a = getIx(i, j);
      const b = getIx(i, j + 1);
      const c = getIx(i + 1, j + 1);
      const d = getIx(i + 1, j);
      faces.push(a, b, c);
      faces.push(a, c, d);
    }
  }
  this.setIndex(new BufferAttribute(toArray(Uint32Array, faces), 1));
  this.addAttribute('position', new BufferAttribute(toArray(Float32Array, positions), 3));

  function getP(s, t) {
    const p = new Vector3(...plane.origin);
    p.add(px.clone().multiplyScalar(s * sizex));
    p.add(py.clone().multiplyScalar(t * sizey));
    return p;
  }

  function getIx(i, j) {
    if (pIndex[`${i},${j}`]) {
      return pIndex[`${i},${j}`];
    }
    const pt = getP(i / steps - 0.5, j / steps - 0.5);
    positions.push(...pt.toArray());
    pIndex[`${i},${j}`] = incr++;
    return pIndex[`${i},${j}`];
  }
}

PlaneGeometry.prototype = Object.create(BufferGeometry.prototype);
PlaneGeometry.prototype.constructor = BufferGeometry;

export function QuadGeometry(tSteps, sSteps) {
  BufferGeometry.call(this);
  this.type = 'QuadGeometry';
  this.parameters = { tSteps, sSteps };
  const arrays = createQuadBezierGeometry(tSteps, sSteps);

  if (arrays.index) {
    this.setIndex(new BufferAttribute(arrays.index.array, 1));
  }
  delete arrays.index;

  for (const k in arrays) {
    this.addAttribute(k, new BufferAttribute(arrays[k].array, arrays[k].size));
  }
}

QuadGeometry.prototype = Object.create(BufferGeometry.prototype);
QuadGeometry.prototype.constructor = BufferGeometry;

export function RotationalPartGeometry(shape) {
  BufferGeometry.call(this);
  const stepsPerPart = 10;
  const I = shape.radialAmount * stepsPerPart + 1;
  const G = new MultigeometryManager((i, j) => `${i},${j}`);
  const creatorTri = Triangle.patchGeometryCreator(G, {i: Infinity, j: stepsPerPart * shape.radialAmount + 1});
  const creatorQuad = Quad.patchGeometryCreator(G, {i: Infinity, j: stepsPerPart * shape.radialAmount + 1});
  for (const key in shape.patchIndex) {
    const patch = patchToWeights(shape, shape.patchIndex[key]);
    const [i, j] = key.split(',').map(i => parseInt(i));

    if (patch.length <= 10) {
      creatorTri(patch, {i, j});
    } else {
      creatorQuad(patch, {i, j});
    }
  }
  this.setIndex(new BufferAttribute(toArray(Uint16Array, G.faces), 1));
  for (const b in G.arrays) {
    let size = 3;
    if (b == 'uv') {
      size = 2;
    }
    this.addAttribute(b, new BufferAttribute(toArray(Float32Array, G.arrays[b]), size));
  }

  function check() {
    G.posArray.forEach(([ixx, v]) => {
      const fs = G.posArray.filter(vv => {
        return (vv[1].distanceTo(v) < 0.0001 && ixx != vv[0]);
      }).map(([ix, v]) => [ix, [v.x, v.y, v.z].map(f => f.toFixed(2)).join(',')].join(':'));
      if (fs.length > 0) {
        console.log(ixx, fs);
      }
    });
  }
}

RotationalPartGeometry.prototype = Object.create(BufferGeometry.prototype);
RotationalPartGeometry.prototype.constructor = BufferGeometry;

export function TriangleBezierBufferGeometry(weights, uvStart, uvEnd, invert, sSteps) {
  BufferGeometry.call(this);
  const geometry = Triangle.getGeometryFromPatch(weights, uvStart, uvEnd, invert, sSteps);

  const indices = toArray(Uint16Array, geometry.indices);
  const positions = toArray(Float32Array, geometry.positions);
  const normals = toArray(Float32Array, geometry.normals || []);
  const uvs = toArray(Float32Array, geometry.uvs || []);

  this.setIndex(new BufferAttribute(indices, 1));
  this.addAttribute('position', new BufferAttribute(positions, 3));
  this.addAttribute('normal', new BufferAttribute(normals, 3));
  this.addAttribute('uv', new BufferAttribute(uvs, 2));
}

export function QuadBezierBufferGeometry(weights, uvStart, uvEnd, tSteps, sSteps) {
  BufferGeometry.call(this);
  const geometry = Quad.getGeometryFromPatch(weights, uvStart, uvEnd, tSteps);

  const indices = toArray(Uint16Array, geometry.indices);
  const positions = toArray(Float32Array, geometry.positions);
  const normals = toArray(Float32Array, geometry.normals || []);
  const uvs = toArray(Float32Array, geometry.uvs || []);

  this.setIndex(new BufferAttribute(indices, 1));
  this.addAttribute('position', new BufferAttribute(positions, 3));
  this.addAttribute('normal', new BufferAttribute(normals, 3));
  this.addAttribute('uv', new BufferAttribute(uvs, 2));
}

QuadBezierBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
QuadBezierBufferGeometry.prototype.constructor = BufferGeometry;
TriangleBezierBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
TriangleBezierBufferGeometry.prototype.constructor = BufferGeometry;

function createQuadBezierGeometry(tSteps, sSteps) {
  const pointIndex = {};
  let position = [];
  let index = [];
  let current = 0;

  const denom = sSteps + 1;


  for (let i = 0; i < tSteps; ++i) {
    for (let j = 0; j < sSteps; ++j) {
      const lb = getPoint(i, j);
      const lt = getPoint(i, j + 1);
      const rb = getPoint(i + 1, j);
      const rt = getPoint(i + 1, j + 1);
      const face1 = [lb, lt, rt];
      const face2 = [lb, rt, rb];
      index.push(...face1, ...face2);
    }
  }

  index = toArray(Uint16Array, index);
  position = toArray(Float32Array, position);
  return {index: {array: index, size: 1}, position: {array: position, size: 3}};


  function getPoint(i, j) {
    const index = `${i},${j}`;
    if (pointIndex[index]) {
      return pointIndex[index];
    } else {
      position.push(i / tSteps, j / sSteps, 0);
      pointIndex[index] = current++;
      return pointIndex[index];
    }

  }
}

/*function toArray(type, fromArray){
  let array = new type(fromArray.length);
  fromArray.forEach((v,i)=>array[i]=v);
  return array;
}
*/
