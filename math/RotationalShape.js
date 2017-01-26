import {Vector3} from 'three/src/math/Vector3';
import {Curve} from './Curve.js';
import * as Path from './Path.js';

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
    let indices = new Uint16Array(geometry.indices.length);
    geometry.indices.forEach((i,ix)=>{indices[ix]=i})
    let positions = new Float32Array(geometry.positions.length);
    geometry.positions.forEach((f,ix)=>{
      positions[ix]=f;
    })
    return {
      indices: {array:indices, size:1}, 
      positions: {array:positions, size:3}
    }
  })
}

function renderQuadPatch(pointIndex, collection, patchId, steps = 10){
  let patch = collection[patchId];
  let geometry = {indices:[], positions:[], pointsIx:{}}
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

    let point = getPointBezier(...ts(i,j));
    geometry.positions.push(...[point.x, point.y, point.z]);
    let pointId = lastPointId++;
    geometry.pointsIx[key] = pointId;
    return pointId;
  }
  function ts(i,j){
    return [i/steps, j/steps];
  }

  function getPointBezier(t,s){
    let p = new Vector3;
    for(let i = 0; i < 4; ++i){
      for(let j=0;j<4; ++j){
        let key = `${i}${j}`;
        let pointId = patch[key];
        let pp = pointIndex[pointId].clone();
        let bi = Bernstein(4, i, t);
        let bj = Bernstein(4, j, s); 
        p.add(pp.clone().multiplyScalar(bi*bj));
      }
    }
    return p;
  }

  function Bernstein(n,i,z){
    n=n-1;
    let ni = fact(n) / (fact(i) * fact(n-i))
    let B = ni * Math.pow(z, i) * Math.pow(1-z, n-i); 
    return B;
  }

}

function renderTrianglePatch(pointIndex, collection, patchId, steps =10){
  let geometry = { indices:[], positions: [],
    faces:[], pointsIx: {} }
  let w=0, u=0, v=0;
  let points = [];
  let lastPointId = 0;
  let patch = collection[patchId];
  for(let i =0; i < steps; ++i){
    let to = steps - i;

    let first = getPoint(i  ,0, patch);
    let top   = getPoint(i+1,0, patch);
    let second = getPoint(i, 1, patch);
    geometry.indices.push(first, top, second);

    let last = getPoint(i,  steps-i, patch);
    let topl = getPoint(i+1,steps-(i+1),patch);
    let preLast = getPoint(i, steps-i-1, patch);
    geometry.indices.push(last, preLast, topl);

    for(let j=1; j < to-1; ++j){
      let ni = (i + 1)
      let nj = (j + 1)
      let lb = getPoint(i,j, patch);
      let lt = getPoint(i,nj, patch);
      let rb = getPoint(ni,j, patch);
      let rt = getPoint(ni,nj, patch);
      let face1 = [lb, lt, rt];
      let face2 = [lb, rt, rb];
      geometry.indices.push(...face1, ...face2);
    }
  }
  return geometry;

  function getPoint(i,j, patch){
    let key = `${i}${j}`;
    if(geometry.pointsIx[key]) {
      return geometry.pointsIx[key];
    }

    let point = getPointBezier(...uvw(i,j), patch);
    geometry.positions.push(...[point.x, point.y, point.z]);
    let pointId = lastPointId++;
    geometry.pointsIx[key] = pointId;
    return pointId;
  }

  function uvw(i,j){
    let w = i / steps;
    let v = j / steps;
    let u = 1.0 - v - w;
    return [u,v,w]
  }

  function getPointBezier(u,v,w, patch){
    let point = new Vector3;
    for(let key in patch){
      if(key == 'length') continue;
      let pointId = patch[key];
      let pp = pointIndex[pointId].clone();
      let k=parseInt(key[0]),
          j=parseInt(key[1]),
          i=parseInt(key[2]);
      let n = i+j+k;
      let pows = pow(u,i)* pow(v,j) * pow(w,k);
      let B =  pows * fact(n) / (fact(i)*fact(j)*fact(k));
      point.add(pp.multiplyScalar(B));
    }
    return point;
  }

  function pow(a,p){
    return Math.pow(a,p);
  }

}

function fact(n){
  let F = 1;
  for(let i = n; i >= 1; --i){
    F*=i;
  }
  return F;
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

function createCylinders(part, props){
  let coneSegments = (props.topCone? 1:0) + (props.bottomCone?1:0);
  let hasBottomCone = props.bottomCone;
  let hasTopCone = props.topCone;
  //let segmentLength = props.length / props.lengthSegments;
  //let segmentNormalizedLength = 1.0 / props.lengthSegments;
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
  return slice;
}

function createInitialSlices(part, props){
  part.sliceAmount = props.lengthSegments+1;


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
    controlPoints.length = 10;
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

function createConeAt_old(part, props,tCone){
  if( !(tCone== 0 || tCone == 1)) {
    console.error('t for cone is incorrect');
    return;
  }
  let way = tCone == 0?1:-1;

  let {orientation, radialSegments, lengthSegments, length, radius} = props;
  
  let lengthSegmentLength = length/(lengthSegments);
  let normalizedSegmentLength = 1 / lengthSegments;
  let coneBaseWeight1 = lengthSegmentLength * 0.5;
  let coneBaseWeight2 = lengthSegmentLength * 0.5;
  let circularWeight = getWeightForCircleWith(radialSegments, radius);
  let tipPlane = getSlicePlane(part, orientation, tCone);
  let nextT = tCone + way * normalizedSegmentLength;
  let coneBasePlane = getSlicePlane(part, orientation, nextT);
  let points = [...circleInPlane(tipPlane, radialSegments, radius*0.1)];
  let basePoints = [...circleInPlane(coneBasePlane, radialSegments,radius)];
  let trianglePatches = [];
  let lengthIndex = tCone * lengthSegments;
  points.forEach(({point, tangent}, ix)=>{
    let nextIndex = ix+1 == points.length?0:ix+1;
    let nextPoint = Object.assign({},points[nextIndex]);
    let bp1 = {...basePoints[ix]};
    let bp1w = bp1.point.clone() 
      .add(bp1.tangent.clone().multiplyScalar(+circularWeight));
    let bp2 = {...basePoints[nextIndex]};
    let bp2w = bp2.point.clone()
      .add(bp2.tangent.clone().multiplyScalar(-circularWeight));
    let pathCentral = Path.get([
      {command:'moveTo', ...bp1.point.clone()}, 
      {command:'curveTo', cp1: bp1w.clone(), 
        cp2: bp2w.clone(), 
        end: bp2.point.clone()}], 0.5);

    let p210 = point.clone()
    let p201 = nextPoint.point.clone();

    let p120 = bp1.point.clone().add(coneBasePlane.normal.clone().multiplyScalar(-way*coneBaseWeight1)) ;
    let p102 = bp2.point.clone().add(coneBasePlane.normal.clone().multiplyScalar(-way*coneBaseWeight1));
    let p111 = pathCentral.clone().add(coneBasePlane.normal.clone().multiplyScalar(-way*coneBaseWeight2));

    let p030 = bp1.point.clone();

    let p021 = bp1w.clone();
    let p012 = bp2w.clone();

    let p003 = bp2.point.clone();
    pushPoint(part, `${lengthIndex}` , tipPlane.origin),
    pushPoint(part, `${lengthIndex}${sign(way)},${ix}`, p210), 
    pushPoint(part, `${lengthIndex}${sign(way)},${nextIndex}`,p201), 

    pushPoint(part, `${lengthIndex+way}${sign(-way)},${ix}`, p120),
    pushPoint(part, `${lengthIndex}:111,${ix}`, p111),
    pushPoint(part, `${lengthIndex+way}${sign(-way)},${nextIndex}`, p102),

    pushPoint(part, `${lengthIndex+way},${ix}`, p030),
    pushPoint(part, `${lengthIndex+way},${ix}+`, p021),
    pushPoint(part, `${lengthIndex+way},${nextIndex}-`, p012),
    pushPoint(part, `${lengthIndex+way},${nextIndex}`, p003)


    let controlPoints = {
      '300': `${lengthIndex}`,

      '210': `${lengthIndex}${sign(way)},${ix}`,
      '201': `${lengthIndex}${sign(way)},${nextIndex}`,
      
      '120': `${lengthIndex+way}${sign(-way)},${ix}`,
      '111': `${lengthIndex}:111,${ix}`,
      '102': `${lengthIndex+way}${sign(-way)},${nextIndex}`,

      '030': `${lengthIndex+way},${ix}`,
      '021': `${lengthIndex+way},${ix}+`,
      '012': `${lengthIndex+way},${nextIndex}-`,
      '003': `${lengthIndex+way},${nextIndex}`,
    }
    controlPoints.length = 10;
    trianglePatches.push(controlPoints);
  });
  return trianglePatches;

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

function _createBezierPatches(props){
  // We have slices, each of them will have four conrtol points
  // This gives us 12 CP for each point in slice
  // We need 4 more control points per patch, which initially should 
  // be interpolated from slices in pitch-yaw plane at 0.25 
  // of they's distance from each neibour slice
  // *  *  *  *
  // *  0  0  *
  // *  0  0  *
  // *  *  *  *
  // 0 - are interpolated points;
}



class RotationalPart{
  constructor(props){
    this.props = props;
    this._createMainAxis();
    this._createSlices();
  }

  hasInterpolatedSlicePoints(props){
    let {slices} = props;
    return slices.filter(s=>!s.interpolated).length == 0;
  }


  recalculateInitialInterpolations(){

  }

  get geometry(){
  }



  create2DPathInPlane(normal, origin, path){
  }

  get sliceCurves(){
    let {slices} = this.props;
    let geometries = [];
    for(slice of slices){
      let {t, path, orientation} = slice;
      let normal, origin;
      switch(orientation){
        case 'top-vector':
          normal = this.props.topVector.clone();
          origin = path.getPoint(t)
          break;
        case 'path-tangent':
        default:
          normal = path.getNormal(t);
          origin = path.getPoint(t)
          break;
      }
      geometries.push(this.create2DPathInPlane(normal, origin, path))
    }
    return geometries;
  }

  get lengthCurves(){}
  get axis(){}
  addSlice(t){}
  addProfile(t, symmetryMode){}


}
