import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';
import {Curve} from './Curve.js';
import * as Triangle from './TriangleBezier.js';
import * as Quad from './QuadBezier.js';
import * as Path from './Path.js';
import {fact} from './Math.js';



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
  if(part.topCone) {
    geometries.push(...createGeometryForPatches(part.pointIndex, part.topCone));
  }
  if(part.bottomCone) {
    geometries.push(...createGeometryForPatches(part.pointIndex, part.bottomCone));
  }
  geometries.push(...createGeometryForPatches(part.pointIndex, part.cylindrycal));

  return geometries;
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
  if(bottomCone)props.lengthSegments+=1;
  if(topCone) props.lengthSegments+=1
  if(bottomCone)
    part.bottomCone = createConeAt(part, props, 0);
  if(topCone)
    part.topCone = createConeAt(part, props, 1);
  part.cylindrycal = createCylinders(part, props);
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
      controlPoints['00'] = mkPoint(`${segmentStart},${ix}`,l.clone());
      controlPoints['10'] = mkPoint(`${segmentStart}+,${ix}`,new Vector3().lerpVectors(l,t,lerpLower));
      controlPoints['20'] = mkPoint(`${segmentStart+1}-,${ix}`,new Vector3().lerpVectors(l,t,lerpUpper));
      controlPoints['30'] = mkPoint(`${segmentStart+1},${ix}`,t.clone());

      let lp = lowerSlice.points[`${ix}+`];
      let tp = upperSlice.points[`${ix}+`];

      controlPoints['01'] = mkPoint(`${segmentStart},${ix}+`, lp.clone());
      controlPoints['11'] = mkPoint(`${segmentStart}+,${ix}+`,new Vector3().lerpVectors(lp,tp,lerpLower))
      controlPoints['21'] = mkPoint(`${segmentStart+1}-,${ix}+`, new Vector3().lerpVectors(lp,tp,lerpUpper));
      controlPoints['31'] = mkPoint(`${segmentStart+1},${ix}+`, tp.clone());

      let lm = lowerSlice.points[`${nx}-`];
      let tm = upperSlice.points[`${nx}-`];

      controlPoints['02'] = mkPoint(`${segmentStart},${nx}-`, lm.clone());
      controlPoints['12'] = mkPoint(`${segmentStart}+,${nx}-`,new Vector3().lerpVectors(lm,tm,lerpLower))
      controlPoints['22'] = mkPoint(`${segmentStart+1}-,${nx}-`, new Vector3().lerpVectors(lm,tm,lerpUpper));
      controlPoints['32'] = mkPoint(`${segmentStart+1},${nx}-`, tm.clone());

      let le = lowerSlice.points[`${nx}`];
      let te = upperSlice.points[`${nx}`];

      controlPoints['03'] = mkPoint(`${segmentStart},${nx}`, le.clone());
      controlPoints['13'] = mkPoint(`${segmentStart}+,${nx}`,new Vector3().lerpVectors(le,te,lerpLower))
      controlPoints['23'] = mkPoint(`${segmentStart+1}-,${nx}`, new Vector3().lerpVectors(le,te,lerpUpper));
      controlPoints['33'] = mkPoint(`${segmentStart+1},${nx}`, te.clone());
      controlPoints.length = 16;
      let ls = part.sliceAmount - 1;
      controlPoints.uv = [
        [ 1-(ix / props.radialSegments), segmentStart/ls],
        [ 1-((ix+1) / props.radialSegments), (segmentStart+1)/ls ]
      ];
      totalPatches.push(controlPoints);
    }
  }
  return totalPatches;

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
  circle.forEach(({point, tangent}, i)=>{
    let ix = `${i}`;
    slice.points[ix] = point.clone();
    slice.points[ix + '-'] = point.clone().add(tangent.clone().multiplyScalar(-circularWeight))
    slice.points[ix + '+'] = point.clone().add(tangent.clone().multiplyScalar(circularWeight))
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
    let controlPoints = {
      '300': mkPoint(`${lengthIndex}`, tipSlice.plane.origin.clone()),

      '210': mkPoint(`${lengthIndex}${sign(way)},${ix}`, p210),
      '201': mkPoint(`${lengthIndex}${sign(way)},${nextIndex}`, p201),
      
      '120': mkPoint(`${lengthIndex+way}${sign(-way)},${ix}`, p120),
      '111': mkPoint(`${lengthIndex}:111,${ix}`, p111),
      '102': mkPoint(`${lengthIndex+way}${sign(-way)},${nextIndex}`, p102),

      '030': mkPoint(`${lengthIndex+way},${ix}`, baseSlice.points[`${ix}`]),
      '021': mkPoint(`${lengthIndex+way},${ix}+`,baseSlice.points[`${ix}+`] ),
      '012': mkPoint(`${lengthIndex+way},${nextIndex}-`,baseSlice.points[`${nextIndex}-`]),
      '003': mkPoint(`${lengthIndex+way},${nextIndex}`,baseSlice.points[`${nextIndex}`]),

    }
    let ls = part.sliceAmount - 1;
    let upperU = (ls - 1)/(ls);
    let lowerU = 1/ls


    let fromUV = [ 1-(ix / props.radialSegments), Math.min(upperU, tCone)];
    let toUV = [1-((ix+1) / props.radialSegments), Math.max(lowerU,tCone) ];
    controlPoints.uv = [fromUV, toUV]; 
    controlPoints.length = 10;
    controlPoints.way = way;
    trianglePatches.push(controlPoints);
  }
  return trianglePatches;

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
                  //debugger;
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

/*
function createVirtualSlices(part, props){
  let {slices} = part;
  let mixedSlices = slices.map((slice,ix)=>{
    if(ix == slices.length - 2) return;

    let nextSlice = slices[ix+1];
    let vSlicePoints = slice.path.map((cmd,ix) => {
      if(cmd.command == 'moveTo')



    }

  })

}*/

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
    let t = i / steps;
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
