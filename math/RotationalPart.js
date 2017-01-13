import {Curve} from 'Curve';
import {Path} from 'Curve';

export function createRotationalPart(props){
  let newPart = {_initialProps:props};
  createMainAxis(newPart,props);
  createSlices(newPart, props);
  createInterpolatedPatchPoints(newPart, props);
  return newPart;
}

export function recalculateSlices(part, props){
  return part;
}


export function getRotationalGeometry(props){
  let bezierPatches = _createBezierPatches();
}

function createMainAxis(part, props){
  let {length} = props;
  part.mainAxis = [
    {command:'moveto', x:0,y:0,z:0},
    {command:'lineto', x:0,y:length,z:0}
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
    part.slices
    .push(createSliceAt(part, radialSegments, orientation, radius, (i+1)/lengthSegments));
  }

}

function createSliceAt(part, radialSegments, orientation, sliceRadius, t){
  let plane = getSlicePlane(part, orientation, t);
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
  return path;
}

function getWeightForCircleWith(steps){
  return 0.1;
}

function createConetipContolPoints(part, radialSegments, orientation, t){
  let defaultTipWeight = 0.01;
  let {length} = part;
  let cps = [];
  let plane = getSlicePlane(part, orientation, t)
  for({point} of curcleInPlane(plane, radialSegments){
    cps.push(point.multiplyScalar(defaultTipWeight * length);
  }
  return cps;
}

function* curcleInPlane({normal, origin}, steps){
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
    p0 = p.clone().sub(origin);
    t0 = new Vector3().crossVectors(p0, z).normalize();

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
      normal = path.getNormal(t);
      origin = path.getPoint(t)
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
