import {BufferGeometry} from 'three/src/core/BufferGeometry';
import {BufferAttribute} from 'three/src/core/BufferAttribute';


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
      let face1 = [lb, rt, lt];
      let face2 = [lb, rb, rt];
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

function toArray(type, fromArray){
  let array = new type(fromArray.length);
  fromArray.forEach((v,i)=>array[i]=v);
  return array;
}
