import {patchToWeights} from './Utils.js';
import {MultigeometryManager} from './MultigeometryManager.js';
import {Vector3} from 'three/src/math/Vector3';
import {BufferGeometry} from 'three/src/core/BufferGeometry';
import {BufferAttribute} from 'three/src/core/BufferAttribute';
import {toArray} from './Math.js';
import * as Quad from './QuadBezier.js'
import * as Triangle from './TriangleBezier.js'



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
  let creatorTri = Triangle.patchGeometryCreator(G, {i:Infinity, j:stepsPerPart*shape.radialAmount});
  for(let key in shape.patchIndex){
    let patch = patchToWeights(shape, shape.patchIndex[key]);
    let [i, j] = key.split(',').map(i=>parseInt(i));
    if(patch.length <= 10){
      creatorTri(patch, {i,j});
    }
  }
  this.setIndex(new BufferAttribute(toArray(Uint16Array, G.faces), 1));
  for(let b in G.arrays){
    let size = 3;
    if(b == 'uv') size == 2;
    console.log("add",b);
    this.addAttribute(b, new BufferAttribute(toArray(Float32Array,G.arrays[b]), size));
  }
  check();

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
