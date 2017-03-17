import {patchToWeights} from './Utils.js';
import {MultigeometryManager} from './MultigeometryManager.js';
import {Vector3} from 'three/src/math/Vector3';
import {BufferGeometry} from 'three/src/core/BufferGeometry';
import {BufferAttribute} from 'three/src/core/BufferAttribute';
import {toArray} from './Math.js';
import * as Quad from './QuadBezier.js'
import * as Triangle from './TriangleBezier.js'
import isEqual from 'lodash/isEqual';
import * as GeometryManager from '../GeometryManager.js';


export function PlaneCutGeometry(geometryDescriptor, planes){
  BufferGeometry.call(this);
  this.type = 'PlaneCutGeometry';

  let geometry = GeometryManager.getOrCreateGeometry(geometryDescriptor);
  if(!planes){
    Object.assign(this.attributes, geometry.attributes);
    this.index = geometry.index;
    return;
  }

  planes.forEach(plane=>{
    let [intersected, deletedIx, deletedFa] = findFaces(geometry.index, geometry.attributes.position,plane);
    let [newFaces, pointCircle] = cutFaces(geometry.attributes, intersected, plane);
    let [attributeLists, indexList] = putNewFaces(newFaces, geometry.index, geometry.attributes);
    let [newIndex, newArrays] = removeDeletedFaces(deletedIx, deletedFa, indexList, attributeLists, geometry.attributes, geometry.index);

    geometry.setIndex(new BufferAttribute(toArray(Uint16Array, newIndex), 1));
    for(let k in newArrays){
      let oldAttr = geometry.attributes[k];
      geometry.addAttribute(k, new BufferAttribute(toArray(Float32Array,newArrays[k]), oldAttr.itemSize));
    }
  })

  this.setIndex(geometry.index);
  Object.assign(this.attributes, geometry.attributes);
}

PlaneCutGeometry.prototype = Object.create(BufferGeometry.prototype);
PlaneCutGeometry.prototype.constructor = BufferGeometry;

function putNewFaces(newFaces,index, attributes) {
  let count = attributes.position.count;
  let additionalAttributes = {};
  let unique = [];
  let addIndex = [];
  Object.keys(attributes).forEach(a=>additionalAttributes[a] = []);
  newFaces.forEach(face=>{
    let faceIx = face.map(pointData=>{
      if(pointData.ix !== undefined) return pointData.ix;
      return pushPoint(pointData);
    })
    addIndex.push(...faceIx);
  });
  let returnable = {};
  for(let key in attributes){
    let array = mergeArrays(attributes[key].array, additionalAttributes[key]);
    returnable[key] = array;
  }
  let newIndex = mergeArrays(index.array, addIndex);
  return [returnable, newIndex];

  function pushPoint(pt){
    let uniqueIx = unique.findIndex(p=>isEqual(p, pt));
    if(uniqueIx === -1){
      unique.push(pt)
      putInArrays(pt);
      return unique.length - 1 + count;
    }
    return uniqueIx + count;
  }

  function putInArrays(pt){
    for(let k in pt){
      additionalAttributes[k].push(...pt[k]);
    }
  }

}

function mergeArrays(array, list){
  // let totalCount = array.length + list.length;
  let newArray =[]; 
  
  for(let i =0; i< array.length; ++i){
    newArray.push(array[i]);
  }
  for(let i=0;i <list.length; ++i){
    newArray.push(list[i]);
  }
  return newArray;
}

function removeDeletedFaces(deletedIx, deletedFa, index, arrays, attributes){
  let deletion = new Map; // (positionId)=>decreaseShift
  let newIndex = [];
  let newArrays = {};
  let currentMinoring;
    let was = 0;
    let become = 0;

  for(let i=0; i< (index.length/3); ++i){
    let ix = i * 3;
    if(deletedFa.has(ix)) continue;
    newIndex.push(...index.slice(ix, ix+3).map(j=>{
      let denom = deletedIx.findIndex(a=>j<a);
      if(denom == -1) denom = deletedIx.length;
       //else denom -= 1;
      return j - denom;
    }));
  }

  for(let key in arrays){
    newArrays[key] = [];
  }
  let arrayCount = arrays.position.length / attributes.position.itemSize;

  for(let i=0; i< arrayCount; ++i){
    
    if(deletedIx.indexOf(i) !== -1) continue;

    for(let key in arrays){
      let array = arrays[key];
      let attr = attributes[key];
      let ix = i * attr.itemSize;
      newArrays[key].push(...array.slice(ix,ix + attr.itemSize))
    }
  }
  return [newIndex, newArrays];

}

function findFaces(index, position, plane){
  let intersectedFaces=[];
  let deletedIndexes = new Set;
  let deletedFaces = new Set;
  let pa = position.array;
  let ps = position.itemSize;
  let o = plane.origin;
  let n = plane.normal;
  for(let i = 0; i < index.count; ++i){
    let ix = i * 3;
    let face = [...index.array.slice(ix,  ix+3)];
    let vertices = face.map(j=> pa.slice(j*ps, j*ps + ps));
    let dots = vertices.map(v=>[0,1,2].map(ix=>(v[ix]-o[ix])*n[ix]).reduce((a,v)=>a+v,0));
    let hasDeleted = 0;
    dots.forEach((dot,id)=>{
      if(dot < 0) return;
      deletedIndexes.add(face[id]);
      ++hasDeleted;
    })
    if(hasDeleted > 0) {
      if(hasDeleted < 3)
        intersectedFaces.push(face);
      deletedFaces.add(ix);
    }
  }
  let deletedIx = [...deletedIndexes.entries()].map(a=>a[0]).sort((a,b)=>a-b);
  return [intersectedFaces, deletedIx, deletedFaces]
}

const indexes = [
  [],
  [0],
  [0,1],
  [0,1,2]
];


function cutFaces(attributes, intersectedFaces, plane){
  let position = attributes.position;
  let otherAttrs = Object.keys(attributes).filter(a=>a!='position');
  let pa = position.array;
  let ps = position.itemSize;
  let o = plane.origin;
  let n = plane.normal;
  let newFaces = [];
  let circle = [];
  for(let i =0; i<intersectedFaces.length; ++i){
    let face = intersectedFaces[i];
    let vertices = face.map(j=> pa.slice(j*ps, j*ps + ps));
    let ix = vertices.findIndex(v=>dotPlane(v, o, n) < 0);
    let rFace = [ix, ix+1, ix+2].map(j=>face[j%3])
    let [B, V0, V1] = rFace.map(j=> pa.slice(j*ps, j*ps + ps));
    // B now is below plane;
    let V0upper = dotPlane(V0, o,n) > 0;
    let V1upper = dotPlane(V1, o,n) > 0;
    
    if(V0upper && V1upper){
      let [e0, e1] = [V0, V1].map(v=>[0,1,2].map(j=>v[j]-B[j]))
      let t1 = rayPlane(B, e0, o, n);
      let t2 = rayPlane(B, e1, o, n);

      let p1 = [0,1,2].map(j=>e0[j]*t1 + B[j]);
      let p2 = [0,1,2].map(j=>e1[j]*t2 + B[j]);
      newFaces.push([{ix:rFace[0]}, 
                    Object.assign({position:p1}, lerpAttrs(t1, rFace[0], rFace[1])), 
                    Object.assign({position:p2}, lerpAttrs(t1, rFace[0], rFace[2])) ]);
      circle.push({from:p1, to:p2});
    }else if(V0upper && !V1upper){
      let e0 = [0,1,2].map(j=>V0[j]-B[j]);
      let e1 = [0,1,2].map(j=>V1[j]-V0[j]);
      let t1 = rayPlane(B, e0, o, n);
      let t2 = rayPlane(V0, e1, o, n);
      let p1 = [0,1,2].map(j=>e0[j]*t1+B[j]);
      let p2 = [0,1,2].map(j=>e1[j]*t2+V0[j]);
      newFaces.push([{ix:rFace[0]},
                    Object.assign({position:p1}, lerpAttrs(t1,rFace[0], rFace[1])),
                    Object.assign({position:p2}, lerpAttrs(t2,rFace[1], rFace[2]))])
      newFaces.push([{ix:rFace[0]},
                    Object.assign({position:p2}, lerpAttrs(t2,rFace[1], rFace[2])),
                    {ix:rFace[2]}])
      circle.push({from:p1, to:p2});
    }else if(V1upper && !V0upper){
      let e0 = [0,1,2].map(j=>V1[j]-V0[j]);
      let e1 = [0,1,2].map(j=>V1[j]-B[j]);
      let t1 = rayPlane(V0, e0, o, n);
      let t2 = rayPlane(B, e1, o, n);
      let p1 = [0,1,2].map(j=>e0[j]*t1 + V0[j]);
      let p2 = [0,1,2].map(j=>e1[j]*t2 + B[j]);
      newFaces.push([{ix:rFace[0]},
                    Object.assign({position:p1}, lerpAttrs(t1,rFace[1], rFace[2] )),
                    Object.assign({position:p2}, lerpAttrs(t2,rFace[0], rFace[2] ))
      ])
      newFaces.push([
        {ix:rFace[0]}, 
        {ix:rFace[1]}, 
        Object.assign({position:p1}, lerpAttrs(t1,rFace[1], rFace[2] )),
      ]
                   )
      circle.push({from:p1, to:p2});
    }else{
      debugger;
    }
  }
  //return [[],[]];
  return [newFaces, circle];
  function lerpAttrs(t, fid, tid){
    let vals = {};
    otherAttrs.forEach(attr=>{
      let attribute = attributes[attr];
      let fix = fid * attribute.itemSize;
      let tix = tid * attribute.itemSize;
      let from = attribute.array.slice(fix, fix+attribute.itemSize);
      let to = attribute.array.slice(fix, fix+attribute.itemSize);
      let nums  = indexes[attribute.itemSize];
      vals[attr] = nums.map(i=>(to[i]-from[i])*t+from[i])
    })
    return vals;
  }

}

function rayPlane(ro, e, o, n){
  let u = [0,1,2].map(j=>n[j] * (o[j] - ro[j])).reduce((a,b)=>a+b);
  let d = [0,1,2].map(j=>n[j] * e[j]).reduce((a,b)=>a+b);
  return u / d;

}

function dotPlane(v, o, n){
  return [0,1,2].map(ix=>(v[ix]-o[ix])*n[ix]).reduce((a,b)=>a+b,0);
}

export function PlaneGeometry(plane, sizex, sizey){
  BufferGeometry.call(this);
  this.type='PlaneGeometry';
  let x = new Vector3(1,0,0);
  let y = new Vector3(0,1,0);
  let z = new Vector3(0,0,1);
  let pn = new Vector3(...plane.normal);
  let po = new Vector3(...plane.origin);

  let dots = [x,y,z].map(v=>v.dot(pn)).map((d,ix)=>[d,ix]).sort((a,b)=>b[0] - a[0]);
  let best = [x,y,z][dots[0][1]];
  let px = best.sub(pn.clone().multiplyScalar(dots[0][0])).normalize(); 
  let py = new Vector3().crossVectors(pn, px).normalize();
  let steps = 10
  let pIndex = {};
  let positions = [];
  let faces = [];
  let incr = 0;
  for(let i = 0; i< steps; ++i){
    for(let j =0; j< steps; ++j){
      let s = i/steps - 0.5;
      let t = i/steps - 0.5;
      let a = getIx(i,j);
      let b = getIx(i,j+1);
      let c = getIx(i+1,j+1);
      let d = getIx(i+1,j);
      faces.push(a,b,c);
      faces.push(a,c,d);
    }
  }
  this.setIndex(new BufferAttribute(toArray(Uint16Array, faces), 1));
  this.addAttribute('position', new BufferAttribute(toArray(Float32Array, positions),3));

  function getP(s,t){
    let p = new Vector3(...plane.origin);
    p.add(px.clone().multiplyScalar(s*sizex));
    p.add(py.clone().multiplyScalar(t*sizey));
    return p;
  }

  function getIx(i,j){
    if(pIndex[`${i},${j}`])
      return pIndex[`${i},${j}`];
    let pt = getP(i/steps - 0.5, j/steps - 0.5);
    positions.push(...pt.toArray());
    pIndex[`${i},${j}`] = incr++;
    return pIndex[`${i},${j}`];
  }
}

PlaneGeometry.prototype = Object.create(BufferGeometry.prototype);
PlaneGeometry.prototype.constructor = BufferGeometry;

export function QuadGeometry(tSteps, sSteps){
  BufferGeometry.call(this);
  this.type = 'QuadGeometry';
  this.parameters={ tSteps, sSteps };
  let arrays = createQuadBezierGeometry(tSteps, sSteps);

  if(arrays.index){
    this.setIndex(new BufferAttribute(arrays.index.array, 1));
  }
  delete arrays.index;

  for(let k in arrays){
    this.addAttribute(k, new BufferAttribute(arrays[k].array, arrays[k].size))
  }
}

QuadGeometry.prototype = Object.create(BufferGeometry.prototype);
QuadGeometry.prototype.constructor = BufferGeometry;

export function RotationalPartGeometry(shape){
  BufferGeometry.call(this);
  let stepsPerPart = 10;
  let I = shape.radialAmount*stepsPerPart + 1;
  let G = new MultigeometryManager((i,j)=>`${i},${j}`);
  let creatorTri = Triangle.patchGeometryCreator(G, {i:Infinity, j:stepsPerPart*shape.radialAmount+1});
  let creatorQuad = Quad.patchGeometryCreator(G, {i:Infinity, j:stepsPerPart*shape.radialAmount+1});
  for(let key in shape.patchIndex){
    let patch = patchToWeights(shape, shape.patchIndex[key]);
    let [i, j] = key.split(',').map(i=>parseInt(i));

    if(patch.length <= 10){
      creatorTri(patch, {i,j});
    }else{
      creatorQuad(patch, {i,j});
    }
  }
  this.setIndex(new BufferAttribute(toArray(Uint16Array, G.faces), 1));
  for(let b in G.arrays){
    let size = 3;
    if(b == 'uv') size = 2;
    this.addAttribute(b, new BufferAttribute(toArray(Float32Array,G.arrays[b]), size));
  }

  function check(){
    G.posArray.forEach(([ixx,v])=>{
      let fs = G.posArray.filter(vv=>{
        return (vv[1].distanceTo(v) < 0.0001 && ixx != vv[0]);
      }).map(([ix, v])=>[ix,[v.x,v.y,v.z].map(f=>f.toFixed(2)).join(',')].join(':'))
      if(fs.length > 0)
        console.log(ixx, fs);
    })
  }
}

RotationalPartGeometry.prototype = Object.create(BufferGeometry.prototype);
RotationalPartGeometry.prototype.constructor = BufferGeometry;

export function TriangleBezierBufferGeometry(weights,uvStart, uvEnd, invert, sSteps){
  BufferGeometry.call(this);
  let geometry = Triangle.getGeometryFromPatch(weights, uvStart, uvEnd, invert, sSteps);

  let indices = toArray(Uint16Array, geometry.indices);
  let positions = toArray(Float32Array, geometry.positions);
  let normals = toArray(Float32Array, geometry.normals || []);
  let uvs = toArray(Float32Array, geometry.uvs || []);

  this.setIndex(new BufferAttribute(indices, 1));
  this.addAttribute('position', new BufferAttribute(positions, 3));
  this.addAttribute('normal', new BufferAttribute(normals, 3));
  this.addAttribute('uv', new BufferAttribute(uvs, 2));
}

export function QuadBezierBufferGeometry(weights,uvStart, uvEnd, tSteps, sSteps){
  BufferGeometry.call(this);
  let geometry = Quad.getGeometryFromPatch(weights, uvStart, uvEnd, tSteps);

  let indices = toArray(Uint16Array, geometry.indices);
  let positions = toArray(Float32Array, geometry.positions);
  let normals = toArray(Float32Array, geometry.normals || []);
  let uvs = toArray(Float32Array, geometry.uvs || []);

  this.setIndex(new BufferAttribute(indices, 1));
  this.addAttribute('position', new BufferAttribute(positions, 3));
  this.addAttribute('normal', new BufferAttribute(normals, 3));
  this.addAttribute('uv', new BufferAttribute(uvs, 2));
}

QuadBezierBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
QuadBezierBufferGeometry.prototype.constructor = BufferGeometry;
TriangleBezierBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
TriangleBezierBufferGeometry.prototype.constructor = BufferGeometry;

function createQuadBezierGeometry(tSteps, sSteps){
  let pointIndex = {};
  let position = [];
  let index = [];
  let current = 0

  const denom = sSteps + 1;


  for(let i = 0; i < tSteps; ++i){
    for(let j = 0; j < sSteps; ++j){
      let lb = getPoint(i,j);
      let lt = getPoint(i,j+1);
      let rb = getPoint(i+1,j);
      let rt = getPoint(i+1,j+1);
      let face1 = [lb, lt, rt];
      let face2 = [lb, rt, rb];
      index.push(...face1, ...face2);
    }
  }

  index = toArray(Uint16Array, index);
  position = toArray(Float32Array, position);
  return {index: {array:index, size:1}, position: {array:position, size:3}}


  function getPoint(i,j){
    let index = `${i},${j}`;
    if(pointIndex[index]) return pointIndex[index];
    else{
      position.push(i/tSteps, j/sSteps, 0);
      pointIndex[index] =  current++
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
