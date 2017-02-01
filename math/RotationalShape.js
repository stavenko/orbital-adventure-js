import {Vector2} from 'three/src/math/Vector2';
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


function trianleSpaceIteration(S){
  let sts = [];
  for(let i =0; i<=S; ++i){
    let s = i / S;
    let rest = 1.0 - s;
    let I = S - i;
    if(I == 0) {
      push([s, 0, 0]);
      continue;
    }
    for(let j=0; j <= I; ++j){
      let t = j / I * rest;
      if(1-s-t  < 0) {console.warn('ACHTUNG'); continue;}
      push([s,t, 1-s-t]);
      
    }
  }
  return sts;

  function push(a){
    sts.push(a.map(b=>b.toFixed(2)));
  }
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
  let patch = collection[patchId];
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
    let [uvFrom, uvTo] = patch.uv;
    let uvDist = [0,1].map(i=>uvTo[i] - uvFrom[i]);
    let ts = [t,s];
    let pT = new Vector3;
    let pS = new Vector3;
    let t1 = t + delta,
        s1 = s + delta;
    if(t - 1 < delta) t1 = t - delta;
    if(s - 1 < delta) s1 = s - delta;
    
    for(let i = 0; i < 4; ++i){
      for(let j=0;j<4; ++j){
        let key = `${i}${j}`;
        let pointId = patch[key];
        let pp = pointIndex[pointId].clone();
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

    let uv = new Vector2(...[1,0].map(i=>uvDist[i]*ts[i] + uvFrom[i]));

    return {point, tangentS, tangentT, uv,
      normal: new Vector3().crossVectors(tangentT, tangentS).normalize().negate()
    };
  }

  function Bernstein(n,i,z){
    n=n-1;
    let ni = fact(n) / (fact(i) * fact(n-i))
    let B = ni * Math.pow(z, i) * Math.pow(1-z, n-i); 
    return B;
  }

}

function renderTrianglePatch(pointIndex, collection, patchId, steps = 10){
  let geometry = { indices:[], positions: [],
    faces:[], pointsIx: {}, normals:[], uvs:[] }
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

    for(let j=0; j < to-1; ++j){
      let ni = (i + 1)
      let nj = (j + 1)
      let lb = getPoint(i,j, patch);
      let lt = getPoint(i,nj, patch);
      let rb = getPoint(ni,j, patch);
      let rt = getPoint(ni,nj, patch);
      let face1 = [lb, rt, lt];
      let face2 = [lb, rb, rt];

      let u = i / steps;
      let v = j / steps;
      let w = 1.0 - v - u;

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
    let v = j / steps;
    let w = 1.0 - v - u;
    return [u,v,w]
  }

  function getPointBezier(u,v,w, patch){
    const delta = 0.0001;
    let point = new Vector3;
    let [uvFrom, uvTo] = patch.uv;

    //let uvFrom = [0.25, 1/3];
    //let uvTo = [0.5, 1];
    let uvDiff = [0,1].map(i=>uvTo[i] - uvFrom[i]);

    let uvt = [[1,1], [0,0.66], [0.25,0.66]].map(v=> new Vector2(...v));
    //let uvt = [uvTo, uvFrom,   [uvTo[0], uvFrom[1]]].map(v=> new Vector2(...v));

    let uvDist = [0,1].map(i=>uvTo[i] - uvFrom[i]);
    let pT = new Vector3;
    let pS = new Vector3;
    let u1 = u + delta,
        v1 = v + delta;
    if(u - 1 < delta) u1 = u - delta;
    if(v - 1 < delta) v1 = v - delta;

    let keys = ['300', '210', '201', '120', '111', '102', '030', '021', '012', '003'];

    keys.forEach(key=>{
      let pointId = patch[key];
      let pp = pointIndex[pointId].clone();
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

    //let uv = [0,1,2].map(i=>uvt[i].clone().multiplyScalar(vuw[i]))
      //.reduce((v1,v2)=>v1.add(v2), new Vector2)
    let MaxR = 1-u; 
    let uT = w/MaxR;
    let vt = u;
    let uv = new Vector2(uT * uvDiff[0] + uvFrom[0],
                         vt * uvDiff[1] + uvFrom[1]);
    //if(u > 0 && u < 0.2) console.log(u, uv);


    return {point ,tangentS, tangentT, uv, 
      normal: new Vector3().crossVectors(tangentT, tangentS).normalize().negate() };
  }

  function Bernstein(ijk, uvw){
    //let [i,j,k] = ijk;
    // let [i,k,j] = ijk;

    //let [j,i,k] = ijk;
    //let [j,k,i] = ijk;

    let [k,j,i] = ijk;
    //let [k,i,j] = ijk;

    let [u,v,w] = uvw;
    let n = i+j+k;
    let pows = pow(u,i)* pow(v,j) * pow(w,k);
    return pows * fact(n) / (fact(i)*fact(j)*fact(k));

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
        [segmentStart/ls, ix / props.radialSegments],
        [(segmentStart+1)/ls, (ix+1) / props.radialSegments]
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
    let ls = part.sliceAmount - 1;
    let upperU = (ls - 1)/(ls);
    let lowerU = 1/ls

    let fromUV = [ ix / props.radialSegments, Math.min(upperU, tCone)];
    let toUV = [(ix+1) / props.radialSegments, Math.max(lowerU,tCone) ];
    controlPoints.uv = [fromUV, toUV]; 
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
