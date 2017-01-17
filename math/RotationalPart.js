import {Vector3} from 'three/src/math/Vector3';
import {Curve} from './Curve.js';
import * as Path from './Path.js';

export function createRotationalPart(props){
  let newPart = {_initialProps:props};
  createMainAxis(newPart,props);
  createPatches(newPart, props);
  return newPart;
}

export function recalculateSlices(part, props){
  return part;
}


export function getRotationalGeometry(part){
  console.log("PART", part);
  let geometries = [];
  if(part.topCone) {
    geometries.push(createGeometryForPatches(part.pointIndex, part.topCone));
  }
  return geometries;
}

function createGeometryForPatches(pointIndex, patchesCollection){
  let geometry = {
    indices:[],
    positions: [],
    faces:[],
    pointsIx: {}
  }

  patchesCollection.forEach((patch, ix)=>{
    if(patch.length > 10){
      renderQuadPatch(pointIndex, geometry, patchesCollection, ix)
    }else{
      renderTrianglePatch(pointIndex, geometry, patchesCollection, ix)
    }
  })
  let indices = new Uint16Array(geometry.indices.length);
  geometry.indices.forEach((i,ix)=>{indices[ix]=i})
  let positions = new Float32Array(geometry.positions.length);
  geometry.positions.forEach((f,ix)=>{
    console.log(f);
    positions[ix]=f;
  })
  return {
    indices: {array:indices, size:1}, 
    positions: {array:positions, size:3}
  }

}

function renderTrianglePatch(pointIndex, geometry, collection, patchId, steps =10){
  let w=0, u=0, v=0;
  let points = [];
  let lastPointId = 0;
  let patch = collection[patchId];
  for(let i =0; i < steps; ++i){
    for(let j=0; j < steps; ++j){
      let lb = getPoint(i,j, patch);
      let lt = getPoint(i,j+1, patch);
      let rb = getPoint(i+1,j, patch);
      let rt = getPoint(i+1,j+1, patch);
      let face1 = [lb, lt, rt];
      let face2 = [lb, rt, rb];
      geometry.indices.push(...face1, ...face2);
    }
  }

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
    u = (i / steps);
    v = 1.0 - (j/steps);
    w = 1.0 - (u+v);
    return [u,v,w]
  }

  function getPointBezier(u,v,w, patch){
    let point = new Vector3;
    for(let key in patch){
      let pointId = patch[key];
      let pp = pointIndex[pointId].clone();
      let i=parseInt(key[0]),
          j=parseInt(key[1]),
          k=parseInt(key[2]);
      let n = i+j+k;
      let B = pow(u,i)* pow(v,j) * pow(w,k) * fact(n) / (fact(i)*fact(j)*fact(k));
      point.add(pp.multiplyScalar(B));
    }
    return point;
  }

  function pow(a,p){
    return Math.pow(a,p);
  }

  function fact(n){
    let F = 1;
    for(let i = n; i == 1; --i){
      F*=i
    }
    return F;
  }
}

function createPatches(part, props){
  let {topCone, bottomCone, lengthSegments, radialSegments} = props;
  part.pointIndex = {};
  if(bottomCone)
    part.bottomCone = createConeAt(part, props, 0);
  if(topCone)
    part.topCone = createConeAt(part, props, 1);
}


function createConeAt(part, props,tCone){
  if( !(tCone== 0 || tCone == 1)) {
    console.error('t for cone is incorrect');
    return;
  }
  let way = tCone == 0?1:-1;

  let {orientation, radialSegments, lengthSegments, length} = props;
  let lengthSegmentLength = 1/(lengthSegments+2);
  let coneBaseWeight1 = lengthSegmentLength * 0.25 * length;
  let coneBaseWeight2 = lengthSegmentLength * 0.333 * length;
  let circularWeight = getWeightForCircleWith(radialSegments);
  let tipPlane = getSlicePlane(part, orientation, tCone);
  let nextT = tCone + way * lengthSegmentLength;
  let coneBasePlane = getSlicePlane(part, orientation, nextT);
  let points = [...circleInPlane(tipPlane, radialSegments)];
  let basePoints = [...circleInPlane(coneBasePlane, radialSegments)];
  let trianglePatches = [];
  let lengthIndex = tCone * lengthSegments;
  points.forEach(({point, tangent}, ix)=>{
    let nextIndex = ix+1 == points.length?0:ix+1;
    let nextPoint = points[nextIndex];
    let bp1 = basePoints[ix];
    let bp1w = bp1.point.clone().add(bp1.tangent.clone().multiplyScalar(circularWeight));
    let bp2 = basePoints[nextIndex];
    let bp2w = bp2.point.clone().add(bp2.tangent.clone().multiplyScalar(-circularWeight));
    let pathCentral = Path.get([
      {command:'moveTo', ...bp1.point}, 
      {command:'curveTo', cp1: bp1w, cp2: bp2w, end: bp2.point.clone()}], 0.5);

    let p210 = tipPlane.origin.clone().add(point);
    let p201 = tipPlane.origin.clone().add(nextPoint.point);
    let p120 = bp1.point.clone().add(coneBasePlane.normal.clone().multiplyScalar(coneBaseWeight1)) ;
    let p102 = bp2.point.clone().add(coneBasePlane.normal.clone().multiplyScalar(coneBaseWeight1));
    let p111 = pathCentral.clone().add(coneBasePlane.normal.clone().multiplyScalar(coneBaseWeight2));
    let p030 = bp1.point.clone();
    let p021 = bp1w.clone();
    let p012 = bp2w.clone();
    let p003 = bp2.point.clone();
    pushPoint(part, `${lengthIndex}` , tipPlane.origin),
    pushPoint(part, `${lengthIndex}${sign(way)},${ix}`, p210), // TODO: Correct sum
    pushPoint(part, `${lengthIndex}${sign(way)},${nextIndex}`,p201), // TODO: Correct sum
    pushPoint(part, `${lengthIndex+way}${sign(-way)},${ix}`, p120),
    pushPoint(part, `${lengthIndex}:111,${ix}`, p111),
    pushPoint(part, `${lengthIndex+way}${sign(-way)},${nextIndex}`, p120),
    pushPoint(part, `${lengthIndex+way},${ix}`, p030),
    pushPoint(part, `${lengthIndex+way},${ix}+`, p021),
    pushPoint(part, `${lengthIndex+way},${nextIndex}-`, p012),
    pushPoint(part, `${lengthIndex+way},${nextIndex}`, p003)

    let controlPoints = {
      '300': `${lengthIndex}` ,

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
    trianglePatches.push(controlPoints);
  });
  return trianglePatches;

  function sign(t){
    return t > 0?'+':'-'
  }

}

function pushPoint(part, index, point){
  part.pointIndex[index] = point;
}

function getPoint(part, index, setDefault= null){
  // points indexation - 'N,M', where N = length number [0; lengthSegments]
  // M = radialNumber [0; radialSegments * 2]

}

function createMainAxis(part, props){
  console.log(props);
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
  let weight = getWeightForCircleWith(radialSegments) * sliceRadius;
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

function getWeightForCircleWith(steps){
  return 0.1;
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

function* circleInPlane({normal, origin}, steps){
  let z = new Vector3(0,0,1);
  let y = new Vector3(0,1,0);
  let x = new Vector3(1,0,0);
  let ang = normal.angleTo(z)
  if(ang > 0){
    let axis = new Vector3().crossVectors(normal, z);
    y.applyAxisAngle(axis, ang);
    x.applyAxisAngle(axis, ang);
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
