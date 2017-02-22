import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';
import {Curve} from './Curve.js';
import * as Triangle from './TriangleBezier.js';
import * as Quad from './QuadBezier.js';
import * as Path from './Path.js';
import {fact} from './Math.js';
import {patchToWeights} from './Utils.js';



export function createRotationalShape(props){
  let newPart = {_initialProps:props};
  createMainAxis(newPart,props);
  createInitialSlices(newPart, props);
  createPatches(newPart, props);
  newPart.calculated = true;
  return newPart;
}

export function recalculateSlices(part, props){
  return part;
}



export function getRotationalGeometry(part){
  let geometries = [];
  let patchIndex = part.patchIndex;
  return Object.keys(patchIndex)
    .map(key=>getGeometryAttributes(part, patchIndex[key]))
    .filter(x=>x);
}

function lengthPointsShift(part, fromL){
  let pointIndex = part.pointIndex;
  let radialAmount = part.radialAmount;
  let sliceAmount = part.sliceAmount;
  let patchAmount = radialAmount - 1;
  let hasTopCone = !!pointIndex[`${sliceAmount-1}`];
  let hasBottomCone = !!pointIndex['0'];
  

  for(let j = part.sliceAmount-1; j > fromL; --j){
    if(j == part.sliceAmount-1 && hasTopCone){
      pointsToMove.push([`${j}`,`${j+1}`])
      for(let i = 0; i < radialAmount; ++i){
        pointsToMove.push([`${j}-,${i}`, `${j+1}-,${i}`]);
        pointsToMove.push([`${j}:111,${i}`, `${j+1}:111,${i}`]);
        pointsToMove.push([`${j-1}+,${i}`, `${j-1}+,${i}`]);
      }
    }else{
      for(let i = 0; i < radialAmount; ++i){
        pointsToMove([`${j},${i}`, `${j+1},${i}`]);
        pointsToMove([`${j},${i}-`,`${j+1},${i}-`]);
        pointsToMove([`${j},${i}+`,`${j+1},${i}+`]);

        pointsToMove([`${j}-,${i}`, `${j+1}-,${i}`]);
        pointsToMove([`${j}-,${i}-`,`${j+1}-,${i}-`]);
        pointsToMove([`${j}-,${i}+`,`${j+1}-,${i}+`]);

        pointsToMove([`${j-1}+,${i}`, `${j}+,${i}`]);
        pointsToMove([`${j-1}+,${i}-`,`${j}+,${i}-`]);
        pointsToMove([`${j-1}+,${i}+`,`${j}+,${i}+`]);

      }
    }
    pointsToMove.forEach(([from,to])=>{
      let p = pointIndex[from];
      delete pointIndex[from];
      pointIndex[to] = p
    })
  }

}

function radialPointsShift(part, fromR){
  let pointIndex = part.pointIndex;
  let radialAmount = part.radialAmount;
  let sliceAmount = part.sliceAmount;
  let patchAmount = sliceAmount - 1;
  let hasTopCone = !!pointIndex[`${sliceAmount-1}`];
  let hasBottomCone = !!pointIndex['0'];


  for(let i = 0; i < patchAmount; ++i){
    for(let j = part.radialAmount-1; j >= fromR; --j){
      let pointsToMove = [];
      if((hasBottomCone && i == 0) || (hasTopCone && i == patchAmount -1)){
        let way = i ==0?1:-1;
        let ix = i ==0?0:patchAmount;
        pointsToMove.push([`${ix}${S(way)},${j}`,    `${ix}${S(way)},${j+1}`])
        pointsToMove.push([`${ix}:111,${j}`, `${ix}:111,${j+1}`])
        pointsToMove.push([`${ix+way}${S(-way)},${j}`,  `${ix+way}${S(-way)},${j+1}`])
        if(i !=0){
          pointsToMove.push([`${i},${j}`,   `${i},${j+1}`])
          pointsToMove.push([`${i},${j}+`,  `${i},${j+1}+`])
          pointsToMove.push([`${i},${j}-`,  `${i},${j+1}-`])
        }
      }else{
        pointsToMove.push([`${i},${j}`,   `${i},${j+1}`])
        pointsToMove.push([`${i},${j}-`,   `${i},${j+1}-`])
        pointsToMove.push([`${i},${j}+`,   `${i},${j+1}+`])

        pointsToMove.push([`${i}+,${j}`,   `${i}+,${j+1}`])
        pointsToMove.push([`${i}+,${j}-`,   `${i}+,${j+1}-`])
        pointsToMove.push([`${i}+,${j}+`,   `${i}+,${j+1}+`])

        pointsToMove.push([`${i+1}-,${j}`,    `${i+1}-,${j+1}`])
        pointsToMove.push([`${i+1}-,${j}-`,   `${i+1}-,${j+1}-`])
        pointsToMove.push([`${i+1}-,${j}+`,   `${i+1}-,${j+1}+`])
      }

      if(i == patchAmount -1 && !hasTopCone){
        pointsToMove.push([`${i+1},${j}`,   `${i+1},${j+1}`])
        pointsToMove.push([`${i+1},${j}+`,  `${i+1},${j+1}+`])
        pointsToMove.push([`${i+1},${j}-`,  `${i+1},${j+1}-`])
      }
      pointsToMove.forEach(([from,to])=>{
        let p = pointIndex[from];
        delete pointIndex[from];
        pointIndex[to] = p
      })
    }
  }
  function S(a){
    return a>0?'+':'-';
  }
}

export function splitPartAtS(part, s){
  let lengthPatches = part.sliceAmount -1;
  let {bottomCone, topCone} = part._initialProps;
  for(let i =0; i < lengthPatches; ++i){
    let fromS = part.lengthSlices[i].t;
    let toS = part.lengthSlices[i+1].t;
    if(s > fromS && s < toS){
      if((i == 0  && bottomCone) || ((i == (lengthPatches - 1)) && topCone)){
        console.log("Cannot split cones today");
        return part;
      }

    }
  }

  debugger;

  return part;
}

export function splitPartAtT(part, t){
  let division;
  for(let i = 0; i < part.radialAmount; ++i){
    let t0 = part.radialDivision[i];
    let t1 = part.radialDivision[(i+1)];
    if(i+1 == part.radialAmount) 
      t1 = 1;
    if(t > t0 && t < t1){
      division = i+1;
      let ds = t1 - t0;
      let s = (t-t0)/ds;
      s=1-s
      let ni = (i+1) % part.radialAmount;
    
      let patchSubstitution = [];
      for(let j=0; j < part.sliceAmount-1; ++j){
        let key = `${j},${i}`;
        let patch = part.patchIndex[key];

        if(patch.length > 10){
          let [q1,q2] = Quad.splitT(part.pointIndex, patch, 1-s);
          patchSubstitution.push([part, i, i+1, j, j+1, q1, q2 ]);
        } else {
          let [tt1,t2,t3] = Triangle.splitPatchWithU0(part.pointIndex, patch, s);
          let l = j ==0?0:part.sliceAmount-1;
          patchSubstitution.push([part, i, i+1, l, t2, tt1, 'triangle']);
        }
      }

      radialPointsShift(part,i+1);
      patchSubstitution.forEach(pp=>{
        if(pp[pp.length-1] == 'triangle')
          insertTriangleWeights(...pp);
        else
          insertQuadWeights(...pp);
      })
      break;
    }
  }

  part.radialDivision = [...part.radialDivision.slice(0, division), t, 
    ...part.radialDivision.slice(division)];
  part.radialAmount += 1;

  recreatePatchesFromPoints(part);
  return part;

}

function insertQuadWeights(part, fromR, toR, fromL, toL, q1,q2){
  let {pointIndex} = part;
  let nra = part.radialAmount + 1;
  let nr = (toR+1)%(nra)
  let pr = (toR-1 + nra)%(nra);

  let newMap = {
    [`${fromL},${fromR}+`]: q1['01'],
    [`${fromL}+,${fromR}+`]: q1['11'],
    [`${toL}-,${fromR}+`]: q1['21'].clone(),
    [`${toL},${fromR}+`]: q1['31'],

    [`${fromL},${toR}-`]: q1['02'],
    [`${fromL}+,${toR}-`]: q1['12'],
    [`${toL}-,${toR}-`]: q1['22'],
    [`${toL},${toR}-`]: q1['32'],
    
    [`${fromL},${toR}`]: q1['03'],
    [`${fromL}+,${toR}`]: q1['13'],
    [`${toL}-,${toR}`]: q1['23'],
    [`${toL},${toR}`]: q1['33'],

    [`${fromL},${toR}+`]: q2['01'],
    [`${fromL}+,${toR}+`]: q2['11'],
    [`${toL}-,${toR}+`]: q2['21'],
    [`${toL},${toR}+`]: q2['31'],

    [`${fromL},${nr}-`]: q2['02'],
    [`${fromL}+,${nr}-`]: q2['12'],
    [`${toL}-,${nr}-`]: q2['22'],
    [`${toL},${nr}-`]: q2['32'],
    /*
    [`${fromL},${fromR}+`]: q1['31'],
    [`${fromL}+,${fromR}+`]: q1['21'],
    [`${toL}-,${fromR}+`]: q1['11'],
    [`${toL},${fromR}+`]: q1['01'],

    [`${fromL},${toR}-`]: q1['32'],
    [`${fromL}+,${toR}-`]: q1['22'],
    [`${toL}-,${toR}-`]: q1['12'],
    [`${toL},${toR}-`]: q1['02'],
    
    [`${fromL},${toR}`]: q1['33'],
    [`${fromL}+,${toR}`]: q1['23'],
    [`${toL}-,${toR}`]: q1['13'],
    [`${toL},${toR}`]: q1['03'],

    [`${fromL},${toR}+`]: q2['31'],
    [`${fromL}+,${toR}+`]: q2['21'],
    [`${toL}-,${toR}+`]: q2['11'],
    [`${toL},${toR}+`]: q2['01'],

    [`${fromL},${nr}-`]: q2['32'],
    [`${fromL}+,${nr}-`]: q2['22'],
    [`${toL}-,${nr}-`]: q2['12'],
    [`${toL},${nr}-`]: q2['02'],
   */
  }
  for(let k in newMap){
    if(pointIndex[k]){
      if( pointIndex[k].x != newMap[k].x || 
          pointIndex[k].y != newMap[k].y || 
          pointIndex[k].z != newMap[k].z ) 
        console.info('Diff point', k, pointIndex[k].clone(), newMap[k].clone());
    }
    pointIndex[k] = newMap[k].clone();
  }
}

function insertTriangleWeights(part, fromR, toR, L, t1, t2){
  let {pointIndex} = part;
  let way = L ==0?1:-1;
  let fromL = L
  let toL   = fromL + way;
  //let way='+';
  //let opway='-';
  let S = a=>a<0?'-':'+';

  //let fromR = parseInt(originalPatch['210'].split(','));
  //let toR   = parseInt(originalPatch['201'].split(',')[1]);

  // let's just assume, that points for other patches are saved
  // We must put SEVEN new trianle points from both triangles
  let nra = part.radialAmount + 1;
  let nr = (toR+1)%(nra)
  let pr = (toR-1 + nra)%(nra);
  let newMap={
    [`${fromL}${S(way)},${toR}`]: t2['210'],
    [`${toL}${S(-way)},${toR}`]: t2['120'],
    [`${toL},${toR}`]: t2['030'],

    [`${fromL}:111,${fromR}`]: t1['111'],
    [`${fromL}:111,${toR}`]: t2['111'],

    [`${toL},${toR}-`]: t1['012'],
    [`${toL},${toR}+`] :t2['021'],

    [`${toL},${pr}+`] :t1['021'],
    [`${toL},${nr}-`] :t2['012'],
  }
  
  console.log('create', `${fromL}:111,${fromR}`,`${fromL}:111,${toR}`);
  for(let k in newMap){
    pointIndex[k] = newMap[k].clone();
    if(pointIndex[k] && fromL == 0){
      // there shouldn't be any point for first triangle.
    }
  }
}

export function getLineAtT(part, t){
  let lines = []
  //t = 1-t;
  for(let i = 0; i < part.radialAmount; ++i){

    let t0 = part.radialDivision[i];
    let t1 = part.radialDivision[(i+1)];
    if(i+1 == part.radialAmount) 
      t1 = 1;
    if(t > t0 && t < t1){
      let ds = t1 - t0;
      let s = (t-t0)/ds;
      s = 1- s;
    
      for(let j=0; j < part.sliceAmount-1; ++j){
        let key = `${j},${i}`;
        let patch = part.patchIndex[key];
        if(patch == null){
          console.warn('patch',key, 'is null')
          continue;
        }

        if(patch.length > 10) 
          lines.push(Quad.getGeometryLineAtT(patchToWeights(part, patch), s, 10));
        else
          lines.push(Triangle.getGeometryLineAtT(patchToWeights(part, patch), s, 10));
      }
    }

  }
  return lines;
}

export function getLineAtS(part, s){
  // need to find all circle patches at height s;
  let lines = []
  for(let i = 0; i < part.sliceAmount-1; ++i){
    let slice = part.lengthSlices[i];
    let nextSlice = part.lengthSlices[i+1];
    if(s > slice.t && s < nextSlice.t){
      let dt = nextSlice.t  - slice.t;
      let t = (s - slice.t)/dt;

      for(let j =0; j < part.radialAmount; ++j){
        let key = `${i},${j}`;
        let patch = part.patchIndex[key];
        
        
        if(patch.length > 10) 
          lines.push(Quad.getGeometryLineAtS(patchToWeights(part, patch), t, 10));
        else
          lines.push(Triangle.getGeometryLineAtS(patchToWeights(part, patch), t, 10));
      }
    }
  }
  return lines;
}


function createGeometryForPatches(pointIndex, patchesCollection){
  let geometries = [];
  patchesCollection.forEach((patch, ix)=>{
    if(patch.length > 10){
      geometries.push(renderQuadPatch(pointIndex, patchesCollection, ix))
    }else{
      geometries.push(renderTrianglePatch(pointIndex, patchesCollection, ix))
    }
  });

  return geometries.map(geometry=>{
    let indices = toArray(Uint16Array, geometry.indices);
    let positions = toArray(Float32Array, geometry.positions);
    let normals = toArray(Float32Array, geometry.normals || []);
    let uvs = toArray(Float32Array, geometry.uvs || []);
    return {
      indices: {array:indices, size:1}, 
      positions: {array:positions, size:3},
      normals: {array:normals, size:3},
      uvs: {array:uvs, size:2},
    }
  })
}

function getGeometryAttributes(part, patch){
  if(!patch) return;
  let attrs = [patch.length];
  let pointIndex = part.pointIndex;
  let weights = {};
  for( let key in patch){
    if(pointIndex[patch[key]])
      weights[key] = pointIndex[patch[key]].clone();
  }
  attrs.push(weights)
  attrs.push(...patch.uv);
  if(patch.length == 10){
    attrs.push(patch.way);
  }
  attrs.push(10);
  return attrs;
}

function toArray(type, fromArray){
  let array = new type(fromArray.length);
  fromArray.forEach((v,i)=>array[i]=v);
  return array;
}

function renderQuadPatch(pointIndex, collection, patchId, steps = 10){
  let patchIx = collection[patchId];
  let patch = {}
  for(let k in patchIx){
    if(!pointIndex[patchIx[k]]) {
      patch[k] = patchIx[k];
      continue;
    }    
    patch[k] = pointIndex[patchIx[k]].clone();
  }
  return Quad.getGeometryFromPatch(patch,  steps);
}

function renderTrianglePatch(pointIndex, collection, patchId, steps = 10){
  let patchIx = collection[patchId];
  let patch = {}
  for(let k in patchIx){
    if(!pointIndex[patchIx[k]]) {
      patch[k] = patchIx[k];
      continue;
    }    
    patch[k] = pointIndex[patchIx[k]].clone();
  }
  return Triangle.getGeometryFromPatch(patch,  steps);
}


function createPatches(part, props){
  let {topCone, bottomCone, radialSegments} = props;
  part.pointIndex = {};
  part.patchIndex = {};
  if(bottomCone)props.lengthSegments+=1;
  if(topCone) props.lengthSegments+=1
  if(bottomCone)
    createConeAt(part, props, 0);
  if(topCone)
    createConeAt(part, props, 1);
  createCylinders(part, props);
  recreatePatchesFromPoints(part);

}

export function getPoints(part, pointList){
  if(pointList)
    return pointList.map(ix=>part.pointIndex[ix]);
  return [];
}

export function getSideLineControls(part){
  let props = part._initialProps;
  let radial = part.radialAmount;
  let sliceAmount = part.sliceAmount;
  let hasBottomCone = props.bottomCone;
  let hasTopCone = props.topCone;
  let coneSegments = (props.topCone? 1:0) + (props.bottomCone?1:0);
  let sideLines = [];
  let slices = [];
  for(let i = 0; i < radial; ++i){

    let path = [];
    let controlPoints = [];
    if(hasBottomCone){
      controlPoints.push({ix:'0', ...part.pointIndex['0']})
      controlPoints.push({ix:`0+,${i}`, ...part.pointIndex[`0+,${i}`]})
      controlPoints.push({ix:`1-,${i}`, ...part.pointIndex[`1-,${i}`]})
      controlPoints.push({ix:`1,${i}`,  ...part.pointIndex[`1,${i}`]})

      path.push({command:'moveTo', ...part.pointIndex['0']})
      path.push({command:'curveTo', 
                cp1:part.pointIndex[`0+,${i}`],
                cp2:part.pointIndex[`1-,${i}`],
                end:part.pointIndex[`1,${i}`],
      })
    }else{
      controlPoints.push({ix:`0,${i}`, ...part.pointIndex[`0,${i}`]})
      path.push({command:'moveTo', ...part.pointIndex[`0,${i}`]})
    }
    for(let j =0; j < sliceAmount - coneSegments; ++j){
      let b = hasTopCone?1:0;
      let endIndex = `${j+b+1},${i}`;
      if(hasTopCone && j == (sliceAmount - coneSegments - 1))
        endIndex = `${j+b+1}`;

      controlPoints.push({ix:`${j+b}+,${i}`, ...part.pointIndex[`${j+b}+,${i}`]})
      controlPoints.push({ix:`${j+b+1}-,${i}`, ...part.pointIndex[`${j+b+1}-,${i}`]})
      controlPoints.push({ix:endIndex,  ...part.pointIndex[endIndex]})
        
      path.push({command:'curveTo', 
                cp1: part.pointIndex[`${j+b}+,${i}`],
                cp2: part.pointIndex[`${j+b+1}-,${i}`],
                end: part.pointIndex[endIndex]
      })
    }
    let geometry = Path.getGeometry(path);
    slices.push({geometry, controlPoints})
  }

  return slices;

}

export function getSurfaceControls(part){
  let props = part._initialProps;
  let radialAmount = part.radialAmount;
  let lengthSlices = part.sliceAmount;
  let hasBottomCone = props.bottomCone;
  let hasTopCone = props.topCone;
  let coneSegments = (props.topCone? 1:0) + (props.bottomCone?1:0);
  let slices = [];
  let points = part.pointIndex;
  for(let i = 0; i < radialAmount; ++i){
    let controlPoints = [];
    if(hasTopCone){
      controlPoints.push({ix:`${lengthSlices-1}:111,${i}`, 
      ...points[`${lengthSlices-1}:111,${i}`]});
    }
    if(hasBottomCone){
      controlPoints.push({ix:`0:111,${i}`, 
      ...points[`0:111,${i}`]});
    }
    for(let j=hasBottomCone?1:0; j < lengthSlices - coneSegments ; ++j){
      let nj = (j+1) % lengthSlices;
      controlPoints.push({ix:`${j}+,${i}+`, ...points[`${j}+,${i}+`]});
      controlPoints.push({ix:`${nj}-,${i}+`, ...points[`${nj}-,${i}+`]});
      controlPoints.push({ix:`${j}+,${i}-`, ...points[`${j}+,${i}-`]});
      controlPoints.push({ix:`${nj}-,${i}-`, ...points[`${nj}-,${i}-`]});
    }
    slices.push({controlPoints});
  }
  return slices;
  
}

export function getSliceControls(part){
  let props = part._initialProps;
  let coneSegments = (props.topCone? 1:0) + (props.bottomCone?1:0);
  let radialAmount = part.radialAmount;
  let hasBottomCone = props.bottomCone;
  let hasTopCone = props.topCone;
  let slices = [];
  for(let i = 0; i < part.sliceAmount - coneSegments; ++i){
    let bottomConeSliceNum = (hasBottomCone?1:0);
    let sliceIx = i+bottomConeSliceNum;
    //let slice = getLengthSlice(part, i+ bottomConeSliceNum);
    let points = part.pointIndex;
    let path = [
      {command:'moveTo', ...points[`${sliceIx},0`]}
    ]
    let controlPoints = [];
    for(let j =0; j < radialAmount; ++j){
      let nj = (j+1) % radialAmount;
      controlPoints.push({slice:i+bottomConeSliceNum, ix: `${sliceIx},${j}`, ...points[`${sliceIx},${j}`]})
      controlPoints.push({slice:i+bottomConeSliceNum, ix: `${sliceIx},${j}-`, ...points[`${sliceIx},${j}-`]})
      controlPoints.push({slice:i+bottomConeSliceNum, ix: `${sliceIx},${j}+`, ...points[`${sliceIx},${j}+`]})
      path.push({
        command:'curveTo', 
        cp1:points[`${sliceIx},${j}+`], 
        cp2:points[`${sliceIx},${nj}-`], 
        end:points[`${sliceIx},${nj}`]
      });

    }

    let geometry = Path.getGeometry(path);
    let plane;

    slices.push({
      plane, controlPoints, geometry
    })
  }

  return slices


}

function createCylinders(part, props){
  let coneSegments = (props.topCone? 1:0) + (props.bottomCone?1:0);
  let hasBottomCone = props.bottomCone;
  let hasTopCone = props.topCone;
  let totalPatches = [];

  for(let i = 0; i < part.sliceAmount - coneSegments-1; ++i){
    let bottomConeSliceNum = (hasBottomCone?1:0);
    let segmentStart = (hasBottomCone?1:0) + i;
    let lowerSliceId = i + bottomConeSliceNum;
    let upperSliceId = lowerSliceId + 1;

    let lowerSlice = getLengthSlice(part, lowerSliceId)
    let upperSlice = getLengthSlice(part, upperSliceId);
    const lerpLower = 0.25;
    const lerpUpper = 0.75;

    for(let ix =0; ix < props.radialSegments; ++ix){
      let nx = (ix + 1)%props.radialSegments;
      let l = lowerSlice.points[`${ix}`]
      let t = upperSlice.points[`${ix}`]
      let controlPoints = {};
      mkPoint(`${segmentStart},${ix}`,l.clone());
      mkPoint(`${segmentStart}+,${ix}`,new Vector3().lerpVectors(l,t,lerpLower));
      mkPoint(`${segmentStart+1}-,${ix}`,new Vector3().lerpVectors(l,t,lerpUpper));
      mkPoint(`${segmentStart+1},${ix}`,t.clone());

      let lp = lowerSlice.points[`${ix}+`];
      let tp = upperSlice.points[`${ix}+`];

      mkPoint(`${segmentStart},${ix}+`, lp.clone());
      mkPoint(`${segmentStart}+,${ix}+`,new Vector3().lerpVectors(lp,tp,lerpLower))
      mkPoint(`${segmentStart+1}-,${ix}+`, new Vector3().lerpVectors(lp,tp,lerpUpper));
      mkPoint(`${segmentStart+1},${ix}+`, tp.clone());

      let lm = lowerSlice.points[`${nx}-`];
      let tm = upperSlice.points[`${nx}-`];

      mkPoint(`${segmentStart},${nx}-`, lm.clone());
      mkPoint(`${segmentStart}+,${nx}-`,new Vector3().lerpVectors(lm,tm,lerpLower))
      mkPoint(`${segmentStart+1}-,${nx}-`, new Vector3().lerpVectors(lm,tm,lerpUpper));
      mkPoint(`${segmentStart+1},${nx}-`, tm.clone());

      let le = lowerSlice.points[`${nx}`];
      let te = upperSlice.points[`${nx}`];

      mkPoint(`${segmentStart},${nx}`, le.clone());
      mkPoint(`${segmentStart}+,${nx}`,new Vector3().lerpVectors(le,te,lerpLower))
      mkPoint(`${segmentStart+1}-,${nx}`, new Vector3().lerpVectors(le,te,lerpUpper));
      mkPoint(`${segmentStart+1},${nx}`, te.clone());
    }
  }

  //return totalPatches;

  function mkPoint(index, point){
    pushPoint(part, index, point);
    return index;
  }
}

function getLengthSlice(part, id){
  if(part.lengthSlices[id]) return part.lengthSlices[id];

  console.error('slice not found', id);
}

function getOrCreateLengthSlice(sliceNumber, part, orientation, t){
  if(!part.lengthSlices) part.lengthSlices = {};
  let key = t.toFixed(5);
  if(part.lengthSlices[key] && part.lengthSlices[key].orientation == orientation)
    return part.lengthSlices[key];

  if(!part.calculated) {
    part.lengthSlices[key] = createSliceFromRadialSegments(part, orientation, t);
    return part.lengthSlices[key];
  }

  part.lengthSlices[key] = calculateSliceFromSurface(part, orientation, t);
  return part.lengthSlices[key];
}

function createSliceFromRadialSegments(part, orientation, t){
  let {_initialProps:{radialSegments, radius}} = part;
  let plane = getSlicePlane(part, orientation, t);

  let circle = [...circleInPlane(plane, radialSegments, radius) ]
  let slice = {orientation, t, points:{}}
  let circularWeight = getWeightForCircleWith(radialSegments, radius);
  part.radialDivision = [];
  for(let i=0; i<= radialSegments; ++i){
    part.radialDivision.push(i/radialSegments);
  }
  circle.forEach(({point, tangent}, i)=>{
    let ix = `${i}`;
    slice.points[ix] = point.clone();
    slice.points[ix + '-'] = point.clone().add(tangent.clone().multiplyScalar(circularWeight))
    slice.points[ix + '+'] = point.clone().add(tangent.clone().multiplyScalar(-circularWeight))
  })
  slice.curves = radialSegments;
  return slice;
}


function createInitialSlices(part, props){
  part.sliceAmount = props.lengthSegments+1;
  part.radialAmount = props.radialSegments;

  let noConeSliceAmount = part.sliceAmount;
  if(props.topCone) ++part.sliceAmount;
  if(props.bottomCone) ++part.sliceAmount;
  let noConeLength = props.length - (props.topCone?props.topConeLength:0)
                                  - (props.bottomCone?props.bottomConeLength:0);

  let noConeT = noConeLength / props.length; 
  let bottomConeT = (props.bottomCone?props.bottomConeLength:0) / props.length;
  let ts = [0];
  if(props.bottomCone) ts.push(bottomConeT);
  for(let i = 1; i <= props.lengthSegments; ++i){
    ts.push(bottomConeT + i * noConeT/props.lengthSegments);
  }
  ts.push(1);
  part.lengthSlices = [];
  ts.forEach((t, id)=>{
    let slice = {id,
      t,
      orientation: props.orientation
    };
    if(id == 0 && props.bottomCone || id == part.sliceAmount -1 && props.topCone){
      let plane = getSlicePlane(part, props.orientation, slice.t);
      slice.weights = [...circleInPlane(plane,props.radialSegments, props.radius * 0.1)];
      slice.plane = plane;
    }else{
      let plane = getSlicePlane(part, props.orientation, slice.t);
      slice = {
        ...createSliceFromRadialSegments(part, props.orientation, slice.t),
        ...slice,
        plane
      };
    }
    part.lengthSlices.push(slice);
  });
}

function recreatePatchesFromPoints(part){
  let pointIndex = part.pointIndex;
  let radialAmount = part.radialAmount;
  let sliceAmount = part.sliceAmount;
  let patchAmount = sliceAmount - 1;
  let hasTopCone = !!pointIndex[`${sliceAmount-1}`];
  let hasBottomCone = !!pointIndex['0'];
  let newPatchIndex = {};
  let radialDivision = part.radialDivision;
  for(let i=0; i< patchAmount; ++i){
    let uFrom = part.radialDivision[i];
    let uTo = part.radialDivision[i+1];
    for(let j=0; j< radialAmount; ++j){
      if((hasBottomCone && i == 0) || (hasTopCone && i == (patchAmount-1))){
        newPatchIndex[`${i},${j}`] = mkTPatch(i, i==0?1:-1, j);
      }else
        newPatchIndex[`${i},${j}`]= mkQPatch(i,j);
    }
  }
  part.patchIndex = newPatchIndex;

  function mkQPatch(i, j){
    let ni = i+1;
    let nj = (j+1) % radialAmount;
    let ls = part.sliceAmount - 1;
    let uFrom = radialDivision[j];
    let uTo   = radialDivision[j+1];
    return {
      '00': `${i},${j}`,
      '10': `${i}+,${j}`,
      '20': `${ni}-,${j}`,
      '30': `${ni},${j}`,

      '01': `${i},${j}+`,
      '11': `${i}+,${j}+`,
      '21': `${ni}-,${j}+`,
      '31': `${ni},${j}+`,

      '02': `${i},${nj}-`,
      '12': `${i}+,${nj}-`,
      '22': `${ni}-,${nj}-`,
      '32': `${ni},${nj}-`,

      '03': `${i},${nj}`,
      '13': `${i}+,${nj}`,
      '23': `${ni}-,${nj}`,
      '33': `${ni},${nj}`,
      length:16,
      uv:[
        [ uFrom, i/ls],
        [ uTo, ni/ls ]
      ]

    }

  }

  function mkTPatch(ix, way, rad){
    let ls = sliceAmount - 1;
    let upperU = (ls - 1)/(ls);
    let lowerU = 1/ls;
    let tCone = ix == 0? 0: 1;
    ix = ix == 0?0:ix+1;

    let nr = (rad+1) % radialAmount;

    let uFrom = radialDivision[rad];
    let uTo   = radialDivision[rad+1];

    let fromUV = [ uFrom, Math.min(upperU, tCone)];
    let toUV = [uTo, Math.max(lowerU,tCone) ];
    return {
      '300': `${ix}`,

      '210': `${ix}${sign(way)},${rad}`,
      '201': `${ix}${sign(way)},${nr}`,

      '120': `${ix+way}${sign(-way)},${rad}`,
      '111': `${ix}:111,${rad}`,
      '102': `${ix+way}${sign(-way)},${nr}`,

      '030': `${ix+way},${rad}`,
      '021': `${ix+way},${rad}+`,
      '012': `${ix+way},${nr}-`,
      '003': `${ix+way},${nr}`,
      length:10,
      uv:[fromUV, toUV],
      way

    }
  }
  function sign(t){
    return t > 0?'+':'-'
  }
}

function createConeAt(part, props, tCone){
  let way = tCone == 0?1:-1;
  let tipSliceId = tCone == 0? 0: part.lengthSlices.length-1;
  let coneLength = tCone?props.topConeLength:props.bottomConeLength;
  let coneBaseWeight1 = coneLength * 0.5;
  let coneBaseWeight2 = coneLength * 0.5;

  let tipSlice = getLengthSlice(part, tipSliceId);
  let baseSlice = getLengthSlice(part, tipSliceId + way);
  let controlPoints = {};
  let lengthIndex = tipSliceId; 
  let trianglePatches = [];
  for(let ix =0; ix < props.radialSegments; ++ix){
    let nextIndex = (ix+1)%props.radialSegments;
    let p210 = tipSlice.weights[ix].point.clone();
    let p201 = tipSlice.weights[nextIndex].point.clone();
    let pathCentral = Path.get([
      {command:'moveTo', ...baseSlice.points[`${ix}`].clone()}, 
      {command:'curveTo', cp1: baseSlice.points[`${ix}+`].clone(), 
        cp2: baseSlice.points[`${nextIndex}-`].clone(), 
        end: baseSlice.points[`${nextIndex}`]}], 0.5)

    let triBaseTipWeight = baseSlice.plane.normal.clone()
      .multiplyScalar(-way*coneBaseWeight1)
    let tri111Weight = baseSlice.plane.normal.clone()
      .multiplyScalar(-way*coneBaseWeight1)

    let p120 = baseSlice.points[`${ix}`].clone().add(triBaseTipWeight);
    let p102 = baseSlice.points[`${nextIndex}`].clone().add(triBaseTipWeight);
    let p111 = pathCentral.add(tri111Weight); 
    
    
   mkPoint(`${lengthIndex}`, tipSlice.plane.origin.clone());
                                                                                   
   mkPoint(`${lengthIndex}${sign(way)},${ix}`, p210);
   mkPoint(`${lengthIndex}${sign(way)},${nextIndex}`, p201);
                                                                                   
   mkPoint(`${lengthIndex+way}${sign(-way)},${ix}`, p120);
   mkPoint(`${lengthIndex}:111,${ix}`, p111);
   mkPoint(`${lengthIndex+way}${sign(-way)},${nextIndex}`, p102);
                                                                                   
   mkPoint(`${lengthIndex+way},${ix}`, baseSlice.points[`${ix}`]);
   mkPoint(`${lengthIndex+way},${ix}+`,baseSlice.points[`${ix}+`] );
   mkPoint(`${lengthIndex+way},${nextIndex}-`,baseSlice.points[`${nextIndex}-`]);
   mkPoint(`${lengthIndex+way},${nextIndex}`,baseSlice.points[`${nextIndex}`]);
  }


  function mkPoint(index, point){
    pushPoint(part, index, point);
    return index;
  }
  function sign(t){
    return t > 0?'+':'-'
  }

}


function pushPoint(part, index, point){

  if(part.pointIndex[index] && !eq(part.pointIndex[index], point) ){
    let p1 = part.pointIndex[index];
    let p2 = point;
    console.error(`overriding point [${index}] with 
                  anouther value: ${p1.x},${p1.y},${p1.z} =>   ${p2.x},${p2.y},${p2.z}`);
  }
  part.pointIndex[index] = point;

  function eq(p1,p2){
    let distance = p1.distanceTo(p2);
    if(distance < 1e-5) return true;
    return false;
  }
}

function getPoint(part, index, setDefault= null){
  // points indexation - 'N,M', where N = length number [0; lengthSegments]
  // M = radialNumber [0; radialSegments * 2]

}

function createMainAxis(part, props){
  let {length} = props;
  part.mainAxis = [
    {command:'moveTo', x:0,y:0,z:0},
    {command:'lineTo', x:0,y:length,z:0}
  ];
}


function createSlices(part, props){
  let {
    lengthSegments, 
    radialSegments, 
    topCone, bottomCone,
    radius, length,
    orientation} = props;
  if(! radius) radius = 0.333 * length;
  if(topCone){ // create special control point in the cone tip
    // this point located in the top of the main axis and can be
    // modified via axis, so we need only `radialSegmens` control points
    // oriented the same with the rest slices;
    part.topConeTip = {
      orientation,
      controlPoints: createConetipContolPoints(
        part,radialSegments, orientation, 1
      )
    }
  }

  if(bottomCone) part.bottomConeTip={
    orientation,
    controlPoints: createConetipContolPoints(
        part,radialSegments, orientation, 0
      )
  }
  part.slices = []
  for(let i = 0; i < lengthSegments; ++i){
    let t = (i+1)/lengthSegments;
    let lastFirst = i == 0? 'first':i == (lengthSegments-1)?'last':''
    part.slices
    .push(createSliceAt(part, radialSegments, orientation, radius, lastFirst, t));
  }

}

function createSliceAt(part, radialSegments, orientation, sliceRadius, lastFirst, t){
  let plane = getSlicePlane(part, orientation, t);
  let {normal} = plane;
  let lastWeight = null;
  let prevWeight = null;
  let points = [...circleInPlane(plane, radialSegments)]
  let path = [{command:'moveto', ...points[0].point}]
  let weight = getWeightForCircleWith(radialSegments, sliceRadius);
  for(let i = 1; i <= points.length; ++i){
    let isLast = i == points.length;
    let prev = points[i-1];
    let cur  = points[i]
    if(isLast) cur = points[0];
    let cp1 = prev.tangent.clone().multiplyScalar(weight)
              .add(prev);
    let cp2 = cur.tangent.clone().multiplyScalar(-weight)
              .add(cur);
              
    let end = cur.point;
    if(isLast) end = 'last-moveto';
    let cmd = {command:'curveto', cp1, cp2, end}
    path.push(cmd);
  }
  return {path};
}

function getWeightForCircleWith(steps, radius = 1){
  return 0.4 * radius;
}

function createConetipContolPoints(part, radialSegments, orientation, t){
  let defaultTipWeight = 0.01;
  let {length} = part;
  let cps = [];
  let plane = getSlicePlane(part, orientation, t)
  for({point} of circleInPlane(plane, radialSegments)){
    cps.push(point.multiplyScalar(defaultTipWeight * length));
  }
  return cps;
}

function* circleInPlane({normal, origin}, steps, radius){
  let z = new Vector3(0,0,1);
  let y = new Vector3(0,1,0);
  let x = new Vector3(1,0,0);
  let ang = normal.angleTo(z)
  if(ang > 0){
    let axis = new Vector3().crossVectors(normal, z);
    y.applyAxisAngle(axis, ang).multiplyScalar(radius);
    x.applyAxisAngle(axis, ang).multiplyScalar(radius);
    z = normal.clone();
  }

  const pi2 = Math.PI * 2;
  for(let i = 0; i < steps; ++i){
    let p  = origin.clone();
    let t = 1.0 - i / steps;
    p.add(x.clone().multiplyScalar(Math.cos(t * pi2)));
    p.add(y.clone().multiplyScalar(Math.sin(t * pi2)));
    let p0 = p.clone().sub(origin);
    let t0 = new Vector3().crossVectors(p0, z).normalize();

    yield {point:p, tangent:t0};
  }

}

function getSlicePlane({mainAxis}, orientation, t){
  let normal, origin;
  switch(orientation){
    case 'top-vector':
      normal = this.props.topVector.clone();
      origin = path.getPoint(t)
      break;
    case 'path-tangent':
    default:
      normal = Path.getNormal(mainAxis, t);
      origin = Path.get(mainAxis, t)
      break;
  }
  return {normal, origin};

}
